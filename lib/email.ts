// Email dispatch wrapper. Uses Nodemailer + SMTP when configured via env;
// otherwise runs in "mock" mode (no send) so the pipeline is fully demoable
// without credentials. The caller persists the mock result for traceability.
import nodemailer from "nodemailer";

export interface SendInvoiceEmailInput {
  to: string;
  cc?: string[];
  subject: string;
  body: string;
  pdf: Buffer;
  filename: string;
}

export interface SendInvoiceEmailResult {
  mocked: boolean;
  messageId?: string;
  to: string;
  cc: string[];
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendInvoiceEmail(input: SendInvoiceEmailInput): Promise<SendInvoiceEmailResult> {
  const cc = input.cc ?? [];

  if (!smtpConfigured()) {
    // Mock: pretend to send. The dispatch service records this in the event log.
    return { mocked: true, to: input.to, cc };
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const info = await transport.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: input.to,
    cc,
    subject: input.subject,
    text: input.body,
    attachments: [{ filename: input.filename, content: input.pdf, contentType: "application/pdf" }],
  });

  return { mocked: false, messageId: info.messageId, to: input.to, cc };
}
