import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { runExtraction } from "@/services/extraction.service";

// POST /api/extraction { jobId } — (re-)run extraction for a job. FinOps/Admin
// entry point; a future chatbot can call this to retry a stuck job.
export async function POST(request: Request) {
  const session = await requireRole(["FINOPS", "ADMIN"]);

  const body = (await request.json().catch(() => ({}))) as { jobId?: string };
  if (!body.jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  try {
    const result = await runExtraction(body.jobId, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
