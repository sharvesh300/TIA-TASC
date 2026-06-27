// Generates sample timesheets under ./samples for exercising the pipeline:
//  - clean .xlsx per client (happy path, joins seeded payroll)
//  - messy .xlsx (renamed headers + missing fields → NEEDS_REVIEW path)
//  - .png image timesheet (Tesseract OCR path)
//  - text .pdf timesheet (PDF text-extraction path)
// Run: bunx tsx scripts/generate-samples.ts
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { createCanvas } from "@napi-rs/canvas";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const OUT_DIR = path.join(process.cwd(), "samples");

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function cleanXlsx(clientName: string, rows: { empId: string; fullName: string }[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Payroll_June2026");
  ws.addRow(["Employee ID", "Full Name", "Working Days", "OT Hours"]);
  for (const r of rows) {
    ws.addRow([r.empId, r.fullName, 26, Math.floor(Math.random() * 8)]);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function messyXlsx(rows: { empId: string; fullName: string }[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  // Renamed headers, no employee-id column, stray spacing.
  ws.addRow(["  Name ", "Days worked"]);
  rows.forEach((r, i) => {
    // Drop the name on one row to force a low-confidence / incomplete row.
    ws.addRow([i === 1 ? "" : r.fullName, 26]);
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function imagePng(rows: { empId: string; fullName: string }[]): Buffer {
  const W = 720;
  const H = 120 + rows.length * 36;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "black";
  ctx.font = "22px Arial";
  ctx.fillText("Timesheet — Payroll June 2026", 20, 40);
  ctx.font = "18px Arial";
  ctx.fillText("EmpID      Name                    Days   OT", 20, 84);
  rows.forEach((r, i) => {
    const y = 116 + i * 36;
    const name = r.fullName.length > 18 ? r.fullName.slice(0, 18) : r.fullName.padEnd(18, " ");
    ctx.fillText(`${r.empId}   ${name}   26     ${(i % 6)}`, 20, y);
  });
  return canvas.toBuffer("image/png");
}

async function textPdf(clientName: string, rows: { empId: string; fullName: string }[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 800;
  page.drawText(`Timesheet — ${clientName}`, { x: 50, y, size: 16, font: bold });
  y -= 24;
  page.drawText("Payroll June 2026", { x: 50, y, size: 11, font });
  y -= 30;
  page.drawText("EmpID    Name    Days    OT", { x: 50, y, size: 11, font: bold });
  y -= 20;
  rows.forEach((r, i) => {
    page.drawText(`${r.empId} ${r.fullName} 26 ${i % 5}`, { x: 50, y, size: 11, font });
    y -= 18;
  });
  return doc.save();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  if (clients.length === 0) {
    throw new Error("No clients found — run the seed first (bunx prisma db seed / tsx prisma/seed.ts).");
  }

  for (const client of clients) {
    const employees = await prisma.employee.findMany({
      where: { clientId: client.id },
      orderBy: { empId: "asc" },
      take: 8,
    });
    const rows = employees.map((e) => ({ empId: e.empId, fullName: e.fullName }));
    if (rows.length === 0) {
      console.log(`skipping ${client.name} — no employees`);
      continue;
    }
    const base = slug(client.name);

    await writeFile(path.join(OUT_DIR, `${base}-clean.xlsx`), await cleanXlsx(client.name, rows));
    console.log(`wrote samples/${base}-clean.xlsx (${rows.length} rows)`);
  }

  // Messy + image + pdf variants for the first client that has employees.
  let first = clients[0];
  let firstEmployees = await prisma.employee.findMany({
    where: { clientId: first.id },
    orderBy: { empId: "asc" },
    take: 5,
  });
  for (const c of clients) {
    const emps = await prisma.employee.findMany({ where: { clientId: c.id }, orderBy: { empId: "asc" }, take: 5 });
    if (emps.length > 0) {
      first = c;
      firstEmployees = emps;
      break;
    }
  }
  const firstRows = firstEmployees.map((e) => ({ empId: e.empId, fullName: e.fullName }));
  const base = slug(first.name);

  await writeFile(path.join(OUT_DIR, `${base}-messy.xlsx`), await messyXlsx(firstRows));
  console.log(`wrote samples/${base}-messy.xlsx`);

  await writeFile(path.join(OUT_DIR, `${base}-scan.png`), imagePng(firstRows));
  console.log(`wrote samples/${base}-scan.png`);

  await writeFile(path.join(OUT_DIR, `${base}-timesheet.pdf`), Buffer.from(await textPdf(first.name, firstRows)));
  console.log(`wrote samples/${base}-timesheet.pdf`);

  console.log("\nSample generation complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
