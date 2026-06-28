import type { CanonicalRow, ExtractionResult } from "@/types/extraction";
import type { DocumentFormat } from "@/lib/generated/prisma/client";
import { buildRow, DEFAULT_CURRENCY, DEFAULT_PAY_PERIOD } from "@/agents/_shared";

export interface GptFallbackInput {
  format: DocumentFormat;
  buffer: Buffer;
  /** Raw OCR text from the primary engine, if any (used as the prompt context). */
  priorText?: string;
  /** Rows the primary engine managed to parse, if any. */
  priorRows?: CanonicalRow[];
  mimeType?: string | null;
}

export interface GptFallbackResult extends ExtractionResult {
  /** True when no real model ran (no API key) — the result is a pass-through. */
  mocked: boolean;
}

// Gemini escalation for low-confidence OCR / parsing failures. When GEMINI_API_KEY is configured we
// ask the model to structure the timesheet; otherwise we return a mock that
// passes the prior rows through at low confidence, so the job lands in
// NEEDS_REVIEW rather than silently "succeeding".
export async function extractWithGpt(input: GptFallbackInput): Promise<GptFallbackResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      rows: input.priorRows ?? [],
      overallConfidence: input.priorRows && input.priorRows.length > 0 ? 0.5 : 0,
      mocked: true,
    };
  }

  try {
    const isImage = input.format === "IMAGE";
    const isPdf = input.format === "PDF";
    
    const promptText =
      "Extract a monthly timesheet for billing. Source files vary in format — some give one row " +
      "per employee with period totals already computed; others give one row per employee per day " +
      'with a date and a status ("Worked", "Leave", "Absent", "Off", "Half day", etc.); overtime is ' +
      'noted inconsistently — as a separate column, inline like "+5" or "+5h", or text like ' +
      '"OT: 5 hours" or "overtime 5". Handle all of these.\n\n' +
      "For each employee, compute:\n" +
      "- workingDays: count of days actually worked in the period. Do NOT count leave/absent/off days.\n" +
      "- otHours: total overtime hours for the period, summing every overtime note found regardless of " +
      "how it's written.\n\n" +
      'Return JSON: { "rows": [{ "empId": string, "fullName": string, "payPeriod": string, "workingDays": number, "otHours": number, "currency": string, "dailyBreakdown": [{ "date": string, "status": string, "otHours": number }] }] }. Only include dailyBreakdown when the source ' +
      'actually has per-day rows — omit it for files that already give period totals.\n\n' +
      `Use payPeriod "${DEFAULT_PAY_PERIOD}" and currency "${DEFAULT_CURRENCY}" if absent. ` +
      (input.priorText ? `OCR text follows:\n${input.priorText}` : "");

    const parts: Array<Record<string, unknown>> = [
      { text: promptText },
    ];

    if (isImage || isPdf) {
      const mime = input.mimeType || (isPdf ? "application/pdf" : "image/png");
      parts.push({
        inlineData: {
          mimeType: mime,
          data: input.buffer.toString("base64"),
        },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const resultData = await response.json();
    const rawText = resultData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = JSON.parse(rawText) as {
      rows?: Array<Record<string, string | number> & { dailyBreakdown?: unknown }>;
    };

    const rows: CanonicalRow[] = (parsed.rows ?? []).map((r) => {
      const { dailyBreakdown, ...aggregate } = r;
      const built = buildRow(aggregate).row;
      // Preserve the per-day detail the model found (if any) for audit — the
      // aggregate workingDays/otHours are what's billed, but a reviewer can
      // trace a disputed figure back to the source days.
      if (dailyBreakdown) {
        built.rawData = { ...built.rawData, dailyBreakdown };
      }
      return built;
    });

    return {
      rows,
      overallConfidence: rows.length > 0 ? 0.95 : 0,
      mocked: false,
    };
  } catch (error) {
    console.error("Gemini fallback extraction failed:", error);
    return {
      rows: input.priorRows ?? [],
      overallConfidence: 0,
      mocked: false,
    };
  }
}
