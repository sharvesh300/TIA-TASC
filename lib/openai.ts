// Lazily-constructed OpenAI client. Returns null when OPENAI_API_KEY is unset so
// callers can fall back to a deterministic mock instead of crashing.
import OpenAI from "openai";

let cached: OpenAI | null | undefined;

export function getOpenAI(): OpenAI | null {
  if (cached !== undefined) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  cached = apiKey ? new OpenAI({ apiKey }) : null;
  return cached;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
