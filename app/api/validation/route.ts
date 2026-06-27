import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { runValidations } from "@/services/validation.service";

// POST /api/validation { invoiceId } — run the rule engine against an invoice.
export async function POST(request: Request) {
  const session = await requireRole(["FINOPS", "ADMIN"]);
  const body = (await request.json().catch(() => ({}))) as { invoiceId?: string };
  if (!body.invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }
  try {
    const result = await runValidations(body.invoiceId, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
