// Demo seed: runs the sample timesheets through the REAL pipeline services and
// parks jobs at each stage so every role sees the automation in action on login:
//
//   - Al Marwan : clean.xlsx  → DISPATCHED   (Client sees a finished invoice + PDF;
//                                             Reviewer sees it in history)
//   - Gulf Star : clean.xlsx  → VALIDATED    (Reviewer approval queue)
//   - Gulf Star : messy.xlsx  → NEEDS_REVIEW (FinOps review editor)
//   - Zenith    : clean.xlsx  → EXTRACTED    (FinOps "generate invoice")
//   - Zenith    : scan.png    → NEEDS_REVIEW (FinOps review — OCR/Tesseract)
//
// Run: bunx tsx scripts/seed-demo.ts   (after `bun run samples`)
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createJobFromUpload } from "../services/ingest.service";
import { generateInvoice } from "../services/invoice.service";
import { runValidations } from "../services/validation.service";
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

  const finops = await prisma.user.findUnique({ where: { email: "finops@tia.demo" } });
  const reviewer = await prisma.user.findUnique({ where: { email: "reviewer@tia.demo" } });

  // 1) Al Marwan: clean → fully processed → DISPATCHED.
  console.log("Al Marwan: processing clean.xlsx → DISPATCHED...");
  const jobA = await createJobFromUpload({
    clientId: alMarwan.id,
    file: await fileFromSample("al-marwan-facilities-clean.xlsx"),
  });
  await generateInvoice(jobA.id, finops?.id);
  const invA = await getInvoiceByClientPeriod(alMarwan.id, "2026-06");
  if (invA) {
    await runValidations(invA.id, finops?.id);
    await approveAndDispatch(invA.id, reviewer?.id);
  }

  // 2) Gulf Star: clean → VALIDATED (waits in the reviewer queue).
  console.log("Gulf Star: processing clean.xlsx → VALIDATED (reviewer queue)...");
  const jobB = await createJobFromUpload({
    clientId: gulfStar.id,
    file: await fileFromSample("gulf-star-logistics-clean.xlsx"),
  });
  await generateInvoice(jobB.id, finops?.id);
  const invB = await getInvoiceByClientPeriod(gulfStar.id, "2026-06");
  if (invB) await runValidations(invB.id, finops?.id);

  // 3) Gulf Star: messy → NEEDS_REVIEW (FinOps review editor).
  console.log("Gulf Star: processing messy.xlsx → NEEDS_REVIEW...");
  await createJobFromUpload({
    clientId: gulfStar.id,
    file: await fileFromSample("al-marwan-facilities-messy.xlsx"),
  });

  // 4) Zenith: clean → EXTRACTED (FinOps generate-invoice demo).
  console.log("Zenith: processing clean.xlsx → EXTRACTED...");
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
