// Invoice PDF rendering with pdf-lib. Pure function: takes invoice data and
// returns PDF bytes. Persistence lives in services/pdf.service.ts.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface InvoicePdfLine {
  empId: string;
  employeeName: string;
  gross: number;
  otAmount: number;
  deductions: number;
  netPay: number;
  workingDays: number;
}

export interface InvoicePdfData {
  invoiceId: string;
  clientName: string;
  payPeriod: string;
  currency: string;
  totalAmount: number;
  createdAt: Date;
  lines: InvoicePdfLine[];
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.45, 0.45, 0.5);
const RULE = rgb(0.8, 0.8, 0.85);

export async function buildInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE_HEIGHT - MARGIN;

  const text = (s: string, x: number, yy: number, size = 10, f = font, color = INK) =>
    page.drawText(s, { x, y: yy, size, font: f, color });

  // Header
  text("TIA", MARGIN, y, 22, bold);
  text("INVOICE", PAGE_WIDTH - MARGIN - 80, y, 18, bold, MUTED);
  y -= 28;
  text("Touchless timesheet-to-invoice automation", MARGIN, y, 9, font, MUTED);
  y -= 30;

  text("Bill to", MARGIN, y, 9, bold, MUTED);
  text("Invoice", PAGE_WIDTH / 2, y, 9, bold, MUTED);
  y -= 16;
  text(data.clientName, MARGIN, y, 12, bold);
  text(`#${data.invoiceId.slice(-8).toUpperCase()}`, PAGE_WIDTH / 2, y, 11, font);
  y -= 15;
  text(`Pay period: ${data.payPeriod}`, PAGE_WIDTH / 2, y, 10, font, MUTED);
  y -= 14;
  text(`Date: ${data.createdAt.toLocaleDateString()}`, PAGE_WIDTH / 2, y, 10, font, MUTED);
  y -= 30;

  // Table header
  const cols = { emp: MARGIN, gross: 250, ot: 330, ded: 400, net: 480 };
  page.drawLine({
    start: { x: MARGIN, y: y + 14 },
    end: { x: PAGE_WIDTH - MARGIN, y: y + 14 },
    thickness: 1,
    color: RULE,
  });
  text("Employee", cols.emp, y, 9, bold, MUTED);
  text("Gross", cols.gross, y, 9, bold, MUTED);
  text("OT", cols.ot, y, 9, bold, MUTED);
  text("Deduct.", cols.ded, y, 9, bold, MUTED);
  text("Net pay", cols.net, y, 9, bold, MUTED);
  y -= 6;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: RULE,
  });
  y -= 18;

  const money = (n: number) => n.toFixed(2);

  for (const line of data.lines) {
    if (y < MARGIN + 60) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    const label = `${line.empId} · ${line.employeeName}`;
    text(label.length > 34 ? label.slice(0, 33) + "…" : label, cols.emp, y, 9);
    text(money(line.gross), cols.gross, y, 9);
    text(money(line.otAmount), cols.ot, y, 9);
    text(money(line.deductions), cols.ded, y, 9);
    text(money(line.netPay), cols.net, y, 9);
    y -= 16;
  }

  y -= 6;
  page.drawLine({
    start: { x: MARGIN, y: y + 12 },
    end: { x: PAGE_WIDTH - MARGIN, y: y + 12 },
    thickness: 1,
    color: RULE,
  });
  text("Total", cols.ded, y - 6, 11, bold);
  text(`${data.currency} ${money(data.totalAmount)}`, cols.net, y - 6, 11, bold);

  return doc.save();
}
