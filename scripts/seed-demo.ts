// Demo seed: runs the sample timesheets through the REAL pipeline (now fully
// auto-advancing — createJobFromUpload drives each job to READY_FOR_DISPATCH
// or NEEDS_REVIEW on its own). We only step in manually to push one job all
// the way to DISPATCHED so every role has something in its history on login:
//
//   - Al Marwan : clean.xlsx  → DISPATCHED   (Client sees a finished invoice + PDF;
//                                             Reviewer sees it in history)
//   - Gulf Star : clean.xlsx  → READY_FOR_DISPATCH / VALIDATED (Reviewer queue)
//   - Gulf Star : messy.xlsx  → NEEDS_REVIEW (FinOps review editor)
//   - Zenith    : clean.xlsx  → READY_FOR_DISPATCH (auto-processed end to end)
//   - Zenith    : scan.png    → NEEDS_REVIEW (FinOps review — OCR/Tesseract)
//
// Run: bunx tsx scripts/seed-demo.ts   (after `bun run samples`)
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createJobFromUpload } from "../services/ingest.service";
import { approveAndDispatch } from "../services/dispatch.service";
import { getInvoiceByClientPeriod } from "../repositories/invoice.repo";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SAMPLES = path.join(process.cwd(), "samples");

const MIME: Record<string, string> = {
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".png": "image/png",
  ".pdf": "application/pdf",
};

async function fileFromSample(name: string): Promise<File> {
  const full = path.join(SAMPLES, name);
  const bytes = await readFile(full);
  const ext = path.extname(name);
  return new File([bytes], name, { type: MIME[ext] ?? "application/octet-stream" });
}

async function clearPipeline() {
  // Pipeline data only — clients/employees/payroll/users are left intact.
  await prisma.validationResult.deleteMany({});
  await prisma.invoiceLine.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.extractedRow.deleteMany({});
  await prisma.pipelineEvent.deleteMany({});
  await prisma.pipelineJob.deleteMany({});
}

async function main() {
  console.log("Clearing existing pipeline data...");
  await clearPipeline();

  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  const byCode = (code: string) => {
    const c = clients.find((x) => x.code === code);
    if (!c) throw new Error(`Client ${code} not found — run the main seed first.`);
    return c;
  };
  const alMarwan = byCode("ALMARWAN");
  const gulfStar = byCode("GULFSTAR");
  const zenith = byCode("ZENITHRC");

  const reviewer = await prisma.user.findUnique({ where: { email: "reviewer@tia.demo" } });

  // 1) Al Marwan: clean → auto-advances to READY_FOR_DISPATCH, then approve → DISPATCHED.
  console.log("Al Marwan: processing clean.xlsx → DISPATCHED...");
  await createJobFromUpload({
    clientId: alMarwan.id,
    file: await fileFromSample("al-marwan-facilities-clean.xlsx"),
  });
  const invA = await getInvoiceByClientPeriod(alMarwan.id, "2026-06");
  if (invA) await approveAndDispatch(invA.id, reviewer?.id);

  // 2) Gulf Star: clean → auto-advances to READY_FOR_DISPATCH (reviewer queue).
  console.log("Gulf Star: processing clean.xlsx → READY_FOR_DISPATCH (reviewer queue)...");
  await createJobFromUpload({
    clientId: gulfStar.id,
    file: await fileFromSample("gulf-star-logistics-clean.xlsx"),
  });

  // 3) Gulf Star: messy → auto-pauses at NEEDS_REVIEW (FinOps review editor).
  console.log("Gulf Star: processing messy.xlsx → NEEDS_REVIEW...");
  await createJobFromUpload({
    clientId: gulfStar.id,
    file: await fileFromSample("al-marwan-facilities-messy.xlsx"),
  });

  // 4) Zenith: clean → auto-advances end to end on its own.
  console.log("Zenith: processing clean.xlsx → READY_FOR_DISPATCH...");
  await createJobFromUpload({
    clientId: zenith.id,
    file: await fileFromSample("zenith-retail-co-clean.xlsx"),
  });

  // 5) Zenith: scanned image → NEEDS_REVIEW (Tesseract OCR demo).
  console.log("Zenith: running OCR on scan.png → NEEDS_REVIEW (takes a few seconds)...");
  await createJobFromUpload({
    clientId: zenith.id,
    file: await fileFromSample("al-marwan-facilities-scan.png"),
  });

  // Summary
  const jobs = await prisma.pipelineJob.findMany({
    include: { client: true },
    orderBy: { createdAt: "asc" },
  });
  console.log("\nDemo pipeline state:");
  for (const j of jobs) {
    console.log(`  ${j.client.name.padEnd(24)} ${j.format.padEnd(6)} ${j.status}`);
  }
  console.log("\nDemo seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
