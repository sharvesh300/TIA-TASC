import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { buildErpExcel, erpExportFilename } from "@/lib/erp-export";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  await requireRole(["FINOPS", "ADMIN"]);

  const { jobId } = await params;

  // Only allow export when extraction is complete
  const job = await prisma.pipelineJob.findUnique({
    where: { id: jobId },
    select: { status: true, client: { select: { code: true } }, extractedRows: { select: { payPeriod: true } } },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const exportableStatuses = [
    "EXTRACTED",
    "GENERATING_INVOICE",
    "VALIDATING",
    "READY_FOR_DISPATCH",
    "DISPATCHED",
  ];

  if (!exportableStatuses.includes(job.status)) {
    return NextResponse.json(
      { error: `Cannot export — job is ${job.status}. Extraction must be complete first.` },
      { status: 422 }
    );
  }

  try {
    const buffer = await buildErpExcel(jobId);
    const payPeriod = job.extractedRows[0]?.payPeriod ?? "unknown";
    const filename = erpExportFilename(job.client.code, payPeriod);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
