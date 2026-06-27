/**
 * Gmail ingestion service — uses the Gmail REST API directly via fetch.
 * No googleapis package required.
 *
 * Required env vars (add to .env):
 *   GMAIL_CLIENT_ID       — OAuth2 client ID from Google Cloud Console
 *   GMAIL_CLIENT_SECRET   — OAuth2 client secret
 *   GMAIL_REFRESH_TOKEN   — long-lived refresh token (one-time OAuth flow)
 *   GMAIL_USER_EMAIL      — the inbox to poll (e.g. tasc.timesheets@gmail.com)
 */

import { createJobFromUpload } from "@/services/ingest.service";
import { prisma } from "@/lib/prisma";

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const ACCEPTED_EXTENSIONS = new Set(["xlsx", "xls", "csv", "pdf", "png", "jpg", "jpeg"]);

// ─── OAuth2 Token ────────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;

  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error(
      "Missing Gmail OAuth2 env vars: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN"
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail token refresh failed: ${err}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

// ─── Gmail REST helpers ───────────────────────────────────────────────────────

async function gmailGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${GMAIL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Gmail API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function gmailPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${GMAIL_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gmail API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MessageList { messages?: { id: string }[]; nextPageToken?: string }
interface MessageDetail {
  id: string;
  payload: MimePart;
}
interface MimePart {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: MimePart[];
  headers?: { name: string; value: string }[];
}
interface AttachmentData { data: string; size: number }

// ─── Core ingestion logic ─────────────────────────────────────────────────────

export interface GmailIngestResult {
  messageId: string;
  sender: string;
  subject: string;
  jobsCreated: string[];
  skipped: boolean;
  reason?: string;
}

/**
 * Poll Gmail for unread timesheet emails.
 * For each email with a valid attachment, creates a PipelineJob via ingest.service.
 * Returns a summary of what was processed.
 */
export async function pollGmailTimesheets(maxResults = 20): Promise<GmailIngestResult[]> {
  const query = [
    "is:unread",
    "has:attachment",
    "(subject:timesheet OR subject:attendance OR subject:payroll",
    "OR subject:hours OR subject:invoice OR subject:'time sheet'",
    "OR subject:'working days')",
  ].join(" ");

  const list = await gmailGet<MessageList>(
    `/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
  );

  const messages = list.messages ?? [];
  const results: GmailIngestResult[] = [];

  for (const { id } of messages) {
    try {
      const result = await processMessage(id);
      results.push(result);
    } catch (err) {
      results.push({
        messageId: id,
        sender: "unknown",
        subject: "unknown",
        jobsCreated: [],
        skipped: true,
        reason: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}

async function processMessage(messageId: string): Promise<GmailIngestResult> {
  const msg = await gmailGet<MessageDetail>(`/messages/${messageId}?format=full`);
  const headers = parseHeaders(msg.payload.headers ?? []);

  const sender = headers["from"] ?? "unknown";
  const subject = headers["subject"] ?? "(no subject)";
  const bodyText = extractBody(msg.payload);

  // Resolve clientId from sender email or body
  const clientId = await resolveClientId(sender, bodyText);

  // Walk MIME parts for attachments
  const attachments = collectAttachments(msg.payload);

  if (attachments.length === 0) {
    await markRead(messageId);
    return { messageId, sender, subject, jobsCreated: [], skipped: true, reason: "No valid attachments" };
  }

  if (!clientId) {
    // Can't assign to a client — leave unread, flag for manual review
    return { messageId, sender, subject, jobsCreated: [], skipped: true, reason: "Could not resolve client" };
  }

  const jobsCreated: string[] = [];

  for (const att of attachments) {
    const bytes = await downloadAttachment(messageId, att.body!.attachmentId!);
    const file = new File([new Uint8Array(bytes)], att.filename!, { type: mimeTypeFor(att.filename!) });

    const job = await createJobFromUpload({
      clientId,
      file,
      sourceChannel: "EMAIL",
    });

    jobsCreated.push(job.id);
  }

  // Mark as read so we don't reprocess
  await markRead(messageId);

  return { messageId, sender, subject, jobsCreated, skipped: false };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseHeaders(headers: { name: string; value: string }[]): Record<string, string> {
  return Object.fromEntries(headers.map(h => [h.name.toLowerCase(), h.value]));
}

function extractBody(part: MimePart): string {
  if (part.mimeType === "text/plain" && part.body?.data) {
    return Buffer.from(part.body.data, "base64url").toString("utf-8");
  }
  return (part.parts ?? []).map(extractBody).join("\n");
}

function collectAttachments(part: MimePart): MimePart[] {
  const results: MimePart[] = [];

  if (part.filename && part.body?.attachmentId) {
    const ext = part.filename.split(".").pop()?.toLowerCase() ?? "";
    if (ACCEPTED_EXTENSIONS.has(ext)) {
      results.push(part);
    }
  }

  for (const sub of part.parts ?? []) {
    results.push(...collectAttachments(sub));
  }

  return results;
}

async function downloadAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
  const data = await gmailGet<AttachmentData>(
    `/messages/${messageId}/attachments/${attachmentId}`
  );
  return Buffer.from(data.data, "base64url");
}

async function markRead(messageId: string): Promise<void> {
  await gmailPost(`/messages/${messageId}/modify`, { removeLabelIds: ["UNREAD"] });
}

function mimeTypeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    csv: "text/csv",
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
  };
  return map[ext ?? ""] ?? "application/octet-stream";
}

/**
 * Try to identify which client this email is from.
 * Strategy: match sender domain or email against Client.contactEmail,
 * or look for a client code / name in the email body.
 */
async function resolveClientId(sender: string, body: string): Promise<string | null> {
  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, code: true, name: true, contactEmail: true },
  });

  // 1. Exact email match
  const senderEmail = sender.match(/<(.+?)>/)?.[1] ?? sender.trim();
  for (const c of clients) {
    if (c.contactEmail && senderEmail.toLowerCase().includes(c.contactEmail.toLowerCase())) {
      return c.id;
    }
  }

  // 2. Client code mentioned in body (e.g. "CL001")
  const codeMatch = body.match(/\bCL\d{3}\b/i);
  if (codeMatch) {
    const found = clients.find(c => c.code.toUpperCase() === codeMatch[0].toUpperCase());
    if (found) return found.id;
  }

  // 3. Client name mentioned in body
  for (const c of clients) {
    if (body.toLowerCase().includes(c.name.toLowerCase())) {
      return c.id;
    }
  }

  return null;
}
