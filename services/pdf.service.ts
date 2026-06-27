// Generates and persists invoice PDFs, lazily. The reviewer's "view PDF" and the
// dispatch step both go through ensureInvoicePdf so the bytes exist exactly once.
import { buildInvoicePdf, type InvoicePdfData } from "@/lib/pdf";
import { invoicePath, readStoredFile, saveFile } from "@/lib/storage";
import { getInvoiceById, updateInvoice } from "@/repositories/invoice.repo";

function toPdfData(invoice: NonNullable<Awaited<ReturnType<typeof getInvoiceById>>>): InvoicePdfData {
  return {
    invoiceId: invoice.id,
    clientName: invoice.client.name,
    payPeriod: invoice.payPeriod,
    currency: invoice.currency,
    totalAmount: Number(invoice.totalAmount),
    createdAt: invoice.createdAt,
    lines: invoice.lines.map((l) => ({
      empId: l.empId,
      employeeName: l.employeeName,
      gross: Number(l.gross),
      otAmount: Number(l.otAmount),
      deductions: Number(l.deductions),
      netPay: Number(l.netPay),
      workingDays: Number(l.workingDays),
    })),
  };
}

/** Ensure the invoice PDF exists on disk, returning its bytes. Rebuilds if asked. */
export async function ensureInvoicePdf(invoiceId: string, force = false): Promise<Buffer> {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

  if (invoice.pdfUrl && !force) {
    try {
      return await readStoredFile(invoice.pdfUrl);
    } catch {
      // fall through and regenerate
    }
  }

  const bytes = await buildInvoicePdf(toPdfData(invoice));
  const relativePath = await saveFile(invoicePath(invoice.id), bytes);
  await updateInvoice(invoiceId, { pdfUrl: relativePath });
  return Buffer.from(bytes);
}
