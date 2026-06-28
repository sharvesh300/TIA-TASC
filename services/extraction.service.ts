// Extraction stage. Routes a queued job to the right engine, escalates low-
// confidence OCR to GPT-4o, persists ExtractedRows, and applies the confidence
// gate: high confidence auto-proceeds to EXTRACTED, otherwise NEEDS_REVIEW.
import type { ExtractionEngine, Prisma } from "@/lib/generated/prisma/client";
import { CONFIDENCE_THRESHOLDS, DEFAULT_CONTRACT_WORK_RULES, periodKeyFor } from "@/lib/constants";
import { readStoredFile } from "@/lib/storage";
import { getJobById, replaceExtractedRows, updateJob } from "@/repositories/job.repo";
import { recordEvent } from "@/repositories/event.repo";
import { getActiveContract } from "@/repositories/contract.repo";
import { routeDocument } from "@/agents/document.agent";
import { extractWithGpt } from "@/agents/gpt.fallback";
import { normalizeRowsToPeriod } from "@/agents/_shared";
import type { CanonicalRow, ExtractionContext } from "@/types/extraction";
import { transition, fail } from "@/services/pipeline.service";

export async function runExtraction(jobId: string, actorId?: string | null) {
  const job = await getJobById(jobId);
  if (!job) throw new Error(`PipelineJob ${jobId} not found`);

  try {
    await transition(jobId, "EXTRACTING", {
      type: "EXTRACTION_STARTED",
      actor: "SYSTEM",
      actorId,
      message: `Extracting ${job.format} document`,
      jobData: { processingStartedAt: new Date() },
    });

    const buffer = await readStoredFile(job.fileUrl);

    // The contract governs how this client's timesheets should be read: its
    // billing cadence (monthly/weekly/biweekly/daily) decides how per-day or
    // per-week source rows get rolled up, and its standard shift length
    // converts hour-denominated figures into days.
    const contract = await getActiveContract(job.clientId, new Date());
    const workRules = contract?.workRules
      ? (JSON.parse(JSON.stringify(contract.workRules)) as typeof DEFAULT_CONTRACT_WORK_RULES)
      : DEFAULT_CONTRACT_WORK_RULES;
    const billingPeriodType = contract?.billingPeriodType ?? "MONTHLY";
    const ctx: ExtractionContext = {
      billingPeriodType,
      standardHoursPerShift: workRules.standardHoursPerShift ?? 8,
      defaultPayPeriod: periodKeyFor(new Date(), billingPeriodType),
    };

    let engine: ExtractionEngine = job.format === "XLSX" ? "EXCEL" : "TESSERACT";
    let result = await routeDocument(job.format, buffer, job.originalFileName, ctx);

    // Escalate OCR paths to Gemini when confidence is low or nothing parsed.
    const needsEscalation =
      engine !== "EXCEL" &&
      (result.rows.length === 0 || result.overallConfidence < CONFIDENCE_THRESHOLDS.NEEDS_REVIEW);

    if (needsEscalation) {
      const gpt = await extractWithGpt({
        format: job.format,
        buffer,
        priorRows: result.rows,
        mimeType: job.mimeType,
        context: ctx,
      });
      engine = "GPT4O"; // Keep database enum value as GPT4O to avoid DB migrations
      result = { rows: gpt.rows, overallConfidence: gpt.overallConfidence };
      await recordEvent({
        jobId,
        type: "ESCALATED_TO_GPT",
        actor: "AI",
        actorId,
        confidence: gpt.overallConfidence,
        message: gpt.mocked
          ? "Escalated to Gemini (mock — GEMINI_API_KEY not set)"
          : "Escalated to Gemini vision extraction",
        metadata: { mocked: gpt.mocked, rowCount: gpt.rows.length },
      });
    }

    // Roll per-day/per-week source rows up to the contract's billing period,
    // summing duplicate employee+period rows rather than leaving them split.
    result = { rows: normalizeRowsToPeriod(result.rows, ctx), overallConfidence: result.overallConfidence };

    const rows: Prisma.ExtractedRowCreateManyInput[] = result.rows.map((r: CanonicalRow) => ({
      jobId,
      clientId: job.clientId,
      empId: r.empId ?? null,
      fullName: r.fullName,
      payPeriod: r.payPeriod,
      workingDays: r.workingDays,
      otHours: r.otHours,
      currency: r.currency,
      overallConfidence: result.overallConfidence,
      sourceType: job.format,
      rawData: (r.rawData ?? undefined) as Prisma.InputJsonValue | undefined,
    }));

    await replaceExtractedRows(jobId, job.clientId, rows);
    await updateJob(jobId, { engineUsed: engine, processingCompletedAt: new Date() });

    // Confidence gate.
    if (result.rows.length > 0 && result.overallConfidence >= CONFIDENCE_THRESHOLDS.AUTO_PROCEED) {
      await transition(jobId, "EXTRACTED", {
        type: "EXTRACTION_COMPLETED",
        actor: "SYSTEM",
        actorId,
        confidence: result.overallConfidence,
        message: `Extracted ${rows.length} row(s) via ${engine}`,
      });
    } else {
      await transition(jobId, "NEEDS_REVIEW", {
        type: "FLAGGED_FOR_REVIEW",
        actor: "SYSTEM",
        actorId,
        confidence: result.overallConfidence,
        message:
          rows.length === 0
            ? "No rows could be extracted — manual review required"
            : `Low confidence (${result.overallConfidence.toFixed(2)}) — manual review required`,
      });
    }

    return { engine, rowCount: rows.length, confidence: result.overallConfidence };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed";
    await fail(jobId, message, actorId);
    throw error;
  }
}
