import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { generateInvoice } from "@/services/invoice.service";
import { listInvoicesByStatus } from "@/repositories/invoice.repo";

// GET /api/invoices — list invoices (optionally filtered by status).
export async function GET(request: Request) {
  await requireRole(["FINOPS", "ADMIN", "REVIEWER"]);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const invoices = await listInvoicesByStatus(
    status ? [status as never] : ["DRAFT", "VALIDATED", "DISPATCHED", "APPROVED", "REJECTED", "QUERIED"]
  );
  return NextResponse.json({ invoices });
}

// POST /api/invoices { jobId } — generate an invoice from an extracted job.
export async function POST(request: Request) {
  const session = await requireRole(["FINOPS", "ADMIN"]);
  const body = (await request.json().catch(() => ({}))) as { jobId?: string };
  if (!body.jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }
  try {
    const invoice = await generateInvoice(body.jobId, session.user.id);
    return NextResponse.json({ invoiceId: invoice.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invoice generation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
