/**
 * One-time script to get your Gmail OAuth2 refresh token.
 *
 * Usage:
 *   bun run scripts/get-gmail-token.ts
 *
 * Prerequisites:
 *   1. Go to https://console.cloud.google.com
 *   2. Create a project → Enable Gmail API
 *   3. Credentials → OAuth 2.0 Client ID → Web Application
 *   4. Add  http://localhost:4242/callback  to "Authorised redirect URIs"
 *   5. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env before running
 */

import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import { fileURLToPath } from "url";
import { exec } from "child_process";

// ── Load .env ────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=]+)=["']?([^"'\n]*)["']?/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const CLIENT_ID     = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌  Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env first.");
  process.exit(1);
}

const PORT         = 4242;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE        = "https://www.googleapis.com/auth/gmail.modify";

// ── Build auth URL ────────────────────────────────────────────────────────────
const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log("\n──────────────────────────────────────────────────────");
console.log("  TIA — Gmail OAuth2 Setup");
console.log("──────────────────────────────────────────────────────");
console.log(`\n⏳  Starting local server on http://localhost:${PORT} ...`);
console.log("\n1. Opening your browser to Google's consent screen.");
console.log("2. Sign in with the Gmail inbox you want to poll.");
console.log("3. The token will be captured automatically.\n");

// ── Start a one-shot HTTP server to catch the callback ────────────────────────
const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "", `http://localhost:${PORT}`);

  if (url.pathname !== "/callback") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Waiting for Google callback...");
    return;
  }

  const code  = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end(`<h2>❌ Auth failed: ${error ?? "no code returned"}</h2><p>Close this tab.</p>`);
    server.close();
    return;
  }

  // ── Exchange code for tokens ────────────────────────────────────────────
  fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      redirect_uri:  REDIRECT_URI,
      grant_type:    "authorization_code",
    }),
  })
    .then(async (tokenRes) => {
      const data = await tokenRes.json() as {
        access_token?:  string;
        refresh_token?: string;
        expires_in?:    number;
        error?:         string;
        error_description?: string;
      };

      if (!tokenRes.ok || data.error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h2>❌ Token exchange failed</h2><pre>${data.error}: ${data.error_description}</pre>`);
        server.close();
        return;
      }

      if (!data.refresh_token) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h2>❌ No refresh_token returned</h2>
                 <p>You may have already authorised this app. Go to
                 <a href="https://myaccount.google.com/permissions">Google Account Permissions</a>,
                 revoke the app, then run this script again.</p>`);
        server.close();
        return;
      }

      // ── Patch .env automatically ────────────────────────────────────────────
      let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

      const patch = (key: string, value: string) => {
        const re = new RegExp(`^${key}=.*$`, "m");
        env = re.test(env) ? env.replace(re, `${key}="${value}"`) : env + `\n${key}="${value}"`;
      };

      patch("GMAIL_CLIENT_ID",     CLIENT_ID!);
      patch("GMAIL_CLIENT_SECRET", CLIENT_SECRET!);
      patch("GMAIL_REFRESH_TOKEN", data.refresh_token);

      fs.writeFileSync(envPath, env);

      console.log("\n✅  Tokens received and saved to .env:");
      console.log(`    GMAIL_REFRESH_TOKEN="${data.refresh_token.slice(0, 12)}..."`);
      console.log("\n🚀  Restart your dev server — Gmail ingestion is active.\n");

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<!DOCTYPE html>
        <html>
        <body style="font-family:sans-serif;padding:40px;max-width:500px;margin:auto">
          <h2>✅ Gmail connected!</h2>
          <p>Your refresh token has been saved to <code>.env</code>.</p>
          <p>Close this tab and restart your dev server.</p>
        </body>
        </html>`);
      server.close();
    })
    .catch((err) => {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`<h2>❌ Connection error</h2><pre>${err instanceof Error ? err.message : String(err)}</pre>`);
      server.close();
    });
});

server.listen(PORT, () => {
  // ── Open the browser ──────────────────────────────────────────────────────────
  const opener =
    process.platform === "darwin" ? "open" :
    process.platform === "win32"  ? "start" : "xdg-open";

  exec(`${opener} "${authUrl.replace(/"/g, '\\"')}"`);
  console.log(`If the browser didn't open, go to:\n\n   ${authUrl}\n`);
});
