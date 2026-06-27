// Dispatch stage. A reviewer approves a validated invoice; we render its PDF,
// email it to the client (or mock-send when SMTP is unconfigured), mark the
// invoice DISPATCHED, and advance the job to DISPATCHED. Rejection is also here.
import type { Prisma } from "@/lib/generated/prisma/client";
import { sendInvoiceEmail } from "@/lib/email";
import { getInvoiceById, updateInvoice } from "@/repositories/invoice.repo";
import { recordEvent } from "@/repositories/event.repo";
import { ensureInvoicePdf } from "@/services/pdf.service";
import { transition } from "@/services/pipeline.service";

export async function approveAndDispatch(invoiceId: string, userId?: string | null) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);
  if (invoice.status !== "VALIDATED") {
    throw new Error(`Invoice must be VALIDATED to dispatch (status: ${invoice.status})`);
  }

  const pdf = await ensureInvoicePdf(invoiceId);

  const dispatchConfig = (invoice.client.dispatchConfig as { sendCopyTo?: string[] } | null) ?? {};
  const to = invoice.client.contactEmail ?? `accounts@${invoice.client.code.toLowerCase()}.com`;
  const cc = dispatchConfig.sendCopyTo ?? [];

  const sendResult = await sendInvoiceEmail({
    to,
    cc,
    subject: `Invoice ${invoice.id.slice(-8).toUpperCase()} — ${invoice.client.name} (${invoice.payPeriod})`,
    body: `Please find attached invoice for ${invoice.payPeriod}. Total: ${invoice.currency} ${Number(invoice.totalAmount).toFixed(2)}.`,
    pdf,
    filename: `invoice-${invoice.id.slice(-8)}.pdf`,
  });

  await updateInvoice(invoiceId, {
    status: "DISPATCHED",
    approvedBy: userId ?? null,
    approvedAt: new Date(),
    dispatchedAt: new Date(),
  });

  if (invoice.pipelineJobId) {
    await transition(invoice.pipelineJobId, "DISPATCHED", {
      type: "DISPATCHED",
      actor: "USER",
      actorId: userId,
      message: sendResult.mocked
        ? `Approved & mock-dispatched to ${to}${cc.length ? ` (cc: ${cc.join(", ")})` : ""}`
        : `Approved & emailed to ${to}`,
      metadata: {
        invoiceId,
        to: sendResult.to,
        cc: sendResult.cc,
        mocked: sendResult.mocked,
        messageId: sendResult.messageId ?? null,
      } as unknown as Prisma.InputJsonValue,
    });
  }

  return sendResult;
}

export async function rejectInvoice(invoiceId: string, note: string, userId?: string | null) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

  await updateInvoice(invoiceId, {
    status: "REJECTED",
    rejectionNote: note,
    approvedBy: userId ?? null,
    approvedAt: new Date(),
  });

  if (invoice.pipelineJobId) {
    await recordEvent({
      jobId: invoice.pipelineJobId,
      type: "FAILED",
      actor: "USER",
      actorId: userId,
      message: `Invoice rejected by reviewer: ${note}`,
      metadata: { invoiceId } as unknown as Prisma.InputJsonValue,
    });
  }

  return { rejected: true };
}
