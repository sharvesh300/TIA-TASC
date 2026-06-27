// Dispatch stage. A reviewer approves a validated invoice; we route it to the client's
// preferred delivery channel (EMAIL/WEBHOOK/SFTP), mark the invoice DISPATCHED, and
// advance the job to DISPATCHED. Rejection is also here.
import type { Prisma } from "@/lib/generated/prisma/client";
import { sendInvoiceEmail } from "@/lib/email";
import { getInvoiceById, updateInvoice } from "@/repositories/invoice.repo";
import { ensureInvoicePdf } from "@/services/pdf.service";
import { transition } from "@/services/pipeline.service";
import { DEFAULT_DISPATCH_CONFIG, type DispatchConfigV2 } from "@/lib/constants";

async function dispatchViaEmail(invoiceId: string, config: DispatchConfigV2) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

  const pdf = await ensureInvoicePdf(invoiceId);
  const to = invoice.client.contactEmail ?? `accounts@${invoice.client.code.toLowerCase()}.com`;
  const cc = config.sendCopyTo ?? [];

  const sendResult = await sendInvoiceEmail({
    to,
    cc,
    subject: `Invoice ${invoice.id.slice(-8).toUpperCase()} — ${invoice.client.name} (${invoice.payPeriod})`,
    body: `Please find attached invoice for ${invoice.payPeriod}. Total: ${invoice.currency} ${Number(invoice.totalAmount).toFixed(2)}.`,
    pdf,
    filename: `invoice-${invoice.id.slice(-8)}.pdf`,
  });

  return {
    channel: "EMAIL" as const,
    success: true,
    details: {
      to: sendResult.to,
      cc: sendResult.cc,
      mocked: sendResult.mocked,
      messageId: sendResult.messageId ?? null,
    },
  };
}

async function dispatchViaWebhook(invoiceId: string, config: DispatchConfigV2) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

  if (!config.webhookUrl) {
    throw new Error("Webhook URL not configured for client");
  }

  // Stub: In a real implementation, POST invoice JSON to the webhook URL
  // For now, just log the intent
  const invoiceJson = {
    id: invoice.id,
    clientId: invoice.clientId,
    clientName: invoice.client.name,
    payPeriod: invoice.payPeriod,
    totalAmount: invoice.totalAmount,
    currency: invoice.currency,
    status: invoice.status,
    lines: invoice.lines,
  };

  return {
    channel: "WEBHOOK" as const,
    success: true,
    details: {
      webhookUrl: config.webhookUrl,
      stub: true,
      message: `Would POST invoice to ${config.webhookUrl}`,
      payload: invoiceJson,
    },
  };
}

async function dispatchViaSftp(invoiceId: string, config: DispatchConfigV2) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

  if (!config.sftpConfig) {
    throw new Error("SFTP config not provided for client");
  }

  // Stub: In a real implementation, upload PDF to SFTP
  const pdf = await ensureInvoicePdf(invoiceId);

  return {
    channel: "SFTP" as const,
    success: true,
    details: {
      host: config.sftpConfig.host,
      remotePath: config.sftpConfig.remotePath,
      stub: true,
      message: `Would upload invoice PDF to ${config.sftpConfig.host}:${config.sftpConfig.remotePath}`,
      pdfPath: pdf,
    },
  };
}

export async function approveAndDispatch(invoiceId: string, userId?: string | null) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);
  if (invoice.status !== "VALIDATED") {
    throw new Error(`Invoice must be VALIDATED to dispatch (status: ${invoice.status})`);
  }

  const dispatchConfig: DispatchConfigV2 = invoice.client.dispatchConfig
    ? JSON.parse(JSON.stringify(invoice.client.dispatchConfig))
    : DEFAULT_DISPATCH_CONFIG;

  const channel = dispatchConfig.channel || "EMAIL";
  let dispatchResult;

  switch (channel) {
    case "EMAIL":
      dispatchResult = await dispatchViaEmail(invoiceId, dispatchConfig);
      break;
    case "WEBHOOK":
      dispatchResult = await dispatchViaWebhook(invoiceId, dispatchConfig);
      break;
    case "SFTP":
      dispatchResult = await dispatchViaSftp(invoiceId, dispatchConfig);
      break;
    default:
      throw new Error(`Unknown dispatch channel: ${channel}`);
  }

  await updateInvoice(invoiceId, {
    status: "DISPATCHED",
    approvedBy: userId ?? null,
    approvedAt: new Date(),
    dispatchedAt: new Date(),
  });

  if (invoice.pipelineJobId) {
    let message = `Approved & dispatched via ${channel}`;
    if (channel === "EMAIL") {
      const emailResult = dispatchResult.details as typeof dispatchResult.details & { to: string };
      message = `Approved & emailed to ${emailResult.to}`;
    } else {
      const otherResult = dispatchResult.details as typeof dispatchResult.details & { message: string };
      message = `Approved & dispatched via ${channel}: ${otherResult.message}`;
    }

    await transition(invoice.pipelineJobId, "DISPATCHED", {
      type: "DISPATCHED",
      actor: "USER",
      actorId: userId,
      message,
      metadata: {
        invoiceId,
        channel,
        ...dispatchResult.details,
      } as unknown as Prisma.InputJsonValue,
    });
  }

  return dispatchResult;
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
    // Rejection is correctable, not terminal — send the job back to
    // NEEDS_REVIEW so FinOps can fix the underlying rows/contract and the
    // job can flow through the pipeline again, rather than dead-ending.
    await transition(invoice.pipelineJobId, "NEEDS_REVIEW", {
      type: "FAILED",
      actor: "USER",
      actorId: userId,
      message: `Invoice rejected by reviewer: ${note}`,
      metadata: { invoiceId } as unknown as Prisma.InputJsonValue,
    });
  }

  return { rejected: true };
}
