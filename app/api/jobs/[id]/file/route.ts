import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getJobById } from "@/repositories/job.repo";
import { readStoredFile } from "@/lib/storage";

// GET /api/jobs/[id]/file — stream the originally uploaded timesheet document.
// FinOps/Admin/Reviewer can view any job's source file; a Client may only view
// jobs belonging to their own client.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const job = await getJobById(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const role = session.user.role;
  const isStaff = role === "FINOPS" || role === "ADMIN" || role === "REVIEWER";
  const isOwningClient = role === "CLIENT" && session.user.clientId === job.clientId;
  if (!isStaff && !isOwningClient) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!job.fileUrl) {
    return NextResponse.json({ error: "No document stored for this job" }, { status: 404 });
  }

  const file = await readStoredFile(job.fileUrl);
  const fileName = job.originalFileName ?? "document";
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": job.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${fileName.replace(/"/g, "")}"`,
    },
  });
}
