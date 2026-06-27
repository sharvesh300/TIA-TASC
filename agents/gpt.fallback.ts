import type { CanonicalRow, ExtractionResult } from "@/types/extraction";
import type { DocumentFormat } from "@/lib/generated/prisma/client";
import { getOpenAI, isOpenAIConfigured } from "@/lib/openai";
import { buildRow, DEFAULT_CURRENCY, DEFAULT_PAY_PERIOD } from "@/agents/_shared";

export interface GptFallbackInput {
  format: DocumentFormat;
  buffer: Buffer;
  /** Raw OCR text from the primary engine, if any (used as the prompt context). */
  priorText?: string;
  /** Rows the primary engine managed to parse, if any. */
  priorRows?: CanonicalRow[];
}

export interface GptFallbackResult extends ExtractionResult {
  /** True when no real model ran (no API key) — the result is a pass-through. */
  mocked: boolean;
}

// GPT-4o escalation for low-confidence OCR. When OPENAI_API_KEY is configured we
// ask the model to structure the timesheet; otherwise we return a mock that
// passes the prior rows through at low confidence, so the job lands in
// NEEDS_REVIEW rather than silently "succeeding".
export async function extractWithGpt(input: GptFallbackInput): Promise<GptFallbackResult> {
  const client = getOpenAI();
  if (!client || !isOpenAIConfigured()) {
    return {
      rows: input.priorRows ?? [],
      overallConfidence: input.priorRows && input.priorRows.length > 0 ? 0.5 : 0,
      mocked: true,
    };
  }

  try {
    const isImage = input.format === "IMAGE";
    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text:
          "Extract timesheet rows as JSON: { rows: [{ empId, fullName, payPeriod, workingDays, otHours, currency }] }. " +
          `Use payPeriod \"${DEFAULT_PAY_PERIOD}\" and currency \"${DEFAULT_CURRENCY}\" if absent. ` +
          (input.priorText ? `OCR text follows:\n${input.priorText}` : ""),
      },
    ];
    if (isImage) {
      content.push({
        type: "image_url",
        image_url: { url: `data:image/png;base64,${input.buffer.toString("base64")}` },
      });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: content as never }],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { rows?: Array<Record<string, string | number>> };
    const rows: CanonicalRow[] = (parsed.rows ?? []).map((r) => buildRow(r).row);

    return {
      rows,
      overallConfidence: rows.length > 0 ? 0.95 : 0,
      mocked: false,
    };
  } catch {
    return {
      rows: input.priorRows ?? [],
      overallConfidence: 0,
      mocked: false,
    };
  }
}
