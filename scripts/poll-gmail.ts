import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { pollGmailTimesheets } from "../services/gmail.service";
import { prisma } from "../lib/prisma";

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

async function main() {
  console.log("\n──────────────────────────────────────────────────────");
  console.log("  TIA — Gmail Ingestion Poll");
  console.log("──────────────────────────────────────────────────────");
  console.log("⏳  Polling Gmail for new timesheet emails...");

  try {
    const results = await pollGmailTimesheets(20);
    console.log(`\nFinished polling. Found ${results.length} email(s).\n`);

    for (const r of results) {
      if (r.skipped) {
        console.log(`⚠️  [SKIPPED] Message ${r.messageId} from ${r.sender}`);
        console.log(`    Subject: "${r.subject}"`);
        console.log(`    Reason:  ${r.reason ?? "Unknown skipped reason"}\n`);
      } else {
        console.log(`✅  [PROCESSED] Message ${r.messageId} from ${r.sender}`);
        console.log(`    Subject: "${r.subject}"`);
        console.log(`    Created Jobs: ${r.jobsCreated.join(", ")}\n`);
      }
    }
  } catch (err) {
    console.error("❌  Ingestion error:", err instanceof Error ? err.message : err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
