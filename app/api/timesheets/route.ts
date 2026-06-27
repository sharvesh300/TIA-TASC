import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createJobFromUpload } from "@/services/ingest.service";

// POST /api/timesheets — multipart upload that creates a PipelineJob.
// Programmatic entry point (mirrors the portal Server Action); a future chatbot
// can call this directly. Runs on the Node runtime (default) for file handling.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  // Clients are scoped to their own org; admins/finops may pass clientId explicitly.
  const clientId = (formData.get("clientId") as string) || session.user.clientId;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!clientId) {
    return NextResponse.json({ error: "No clientId resolved for this user" }, { status: 400 });
  }

  try {
    const job = await createJobFromUpload({ clientId, file });
    return NextResponse.json({ jobId: job.id, status: "QUEUED" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
