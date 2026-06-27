import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInvoiceById } from "@/repositories/invoice.repo";
import { ensureInvoicePdf } from "@/services/pdf.service";

// GET /api/invoices/[id]/pdf — stream the invoice PDF (generated on demand).
// FinOps/Admin/Reviewer can view any invoice; a Client may only view their own.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const role = session.user.role;
  const isStaff = role === "FINOPS" || role === "ADMIN" || role === "REVIEWER";
  const isOwningClient = role === "CLIENT" && session.user.clientId === invoice.clientId;
  if (!isStaff && !isOwningClient) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pdf = await ensureInvoicePdf(id);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${id.slice(-8)}.pdf"`,
    },
  });
}
