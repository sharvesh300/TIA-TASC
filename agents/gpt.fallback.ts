import type { CanonicalRow, ExtractionContext, ExtractionResult } from "@/types/extraction";
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
  /** Contract-derived billing cadence + shift length, so the model rolls
   * whatever granularity it finds up to the right period. */
  context?: ExtractionContext;
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

    const billingPeriodType = input.context?.billingPeriodType ?? "MONTHLY";
    const standardHoursPerShift = input.context?.standardHoursPerShift ?? 8;
    const targetPayPeriod = input.context?.defaultPayPeriod ?? DEFAULT_PAY_PERIOD;

    const promptText =
      `This client is billed on a ${billingPeriodType} cadence — roll up everything you find into a ` +
      `single total per employee for the current ${billingPeriodType.toLowerCase()} period ` +
      `("${targetPayPeriod}"), regardless of what granularity the source uses. Source files vary in ` +
      "format — handle all of these:\n" +
      "1. Period totals already computed — one row per employee, days/hours already summed.\n" +
      '2. Weekly summaries — lines like "Week 1 – 8 hrs", "Week 2 – 12 hrs", one per week of the period.\n' +
      '3. Per-day rows — one row per employee per day, with a date and a status ("Worked", "Leave", ' +
      '"Absent", "Off", "Half day", etc.).\n\n' +
      "Overtime is noted inconsistently — as a separate column, inline like \"+5\" or \"+5h\", or text " +
      'like "OT: 5 hours" or "overtime 5". A bare number with no OT/overtime label is WORKED time, not ' +
      "overtime — only count something as overtime if it is explicitly marked as such.\n\n" +
      `Every figure is in HOURS unless it's already a whole-day count. Convert hours to days by dividing ` +
      `by the standard shift length, ${standardHoursPerShift} hours. Do NOT count leave/absent/off days ` +
      "as worked.\n\n" +
      "For each employee, compute:\n" +
      "- workingDays: total days worked across the whole period (after converting any hour figures).\n" +
      "- otHours: total overtime hours for the period, summing every overtime note found regardless of " +
      "how it's written.\n\n" +
      "If you cannot confidently tell whether a figure represents worked time vs. overtime, or cannot " +
      'tell what period a figure covers, set "ambiguous": true on that row rather than guessing — an ' +
      "ambiguous row is routed to a human for review instead of being silently billed.\n\n" +
      'Return JSON: { "rows": [{ "empId": string, "fullName": string, "payPeriod": string, "workingDays": number, "otHours": number, "currency": string, "ambiguous": boolean, "dailyBreakdown": [{ "date": string, "status": string, "otHours": number }], "weeklyBreakdown": [{ "week": number, "hours": number }] }] }. Only include dailyBreakdown/weeklyBreakdown when the source actually has that level of detail — omit them for files that already give period totals.\n\n' +
      `Use payPeriod "${targetPayPeriod}" and currency "${DEFAULT_CURRENCY}" if absent. ` +
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
      rows?: Array<
        Record<string, string | number> & {
          dailyBreakdown?: unknown;
          weeklyBreakdown?: unknown;
          ambiguous?: boolean;
        }
      >;
    };

    let anyAmbiguous = false;
    const rows: CanonicalRow[] = (parsed.rows ?? []).map((r) => {
      const { dailyBreakdown, weeklyBreakdown, ambiguous, ...aggregate } = r;
      if (ambiguous) anyAmbiguous = true;
      const built = buildRow(aggregate, 1, standardHoursPerShift).row;
      // Preserve the per-day/per-week detail the model found (if any) for
      // audit — the aggregate workingDays/otHours are what's billed, but a
      // reviewer can trace a disputed figure back to the source rows.
      if (dailyBreakdown) {
        built.rawData = { ...built.rawData, dailyBreakdown };
      }
      if (weeklyBreakdown) {
        built.rawData = { ...built.rawData, weeklyBreakdown };
      }
      return built;
    });

    return {
      rows,
      // A row the model flagged as ambiguous (can't tell worked-vs-OT, or
      // which period it covers) should not auto-proceed — drop confidence
      // below the NEEDS_REVIEW threshold so a human confirms it.
      overallConfidence: rows.length === 0 ? 0 : anyAmbiguous ? 0.6 : 0.95,
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
