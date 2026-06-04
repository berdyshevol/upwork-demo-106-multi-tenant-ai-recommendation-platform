import { ChatOpenAI } from "@langchain/openai";

/**
 * Chat-model factory + mock gate.
 *
 * Production uses ChatOpenAI billed to the visitor's BYOK key. Tests (and local
 * runs without spending money) use a *mock* mode triggered by a sentinel key
 * prefix `sk-mock-`: the agent then synthesises deterministic, correctly-shaped
 * output from real retrieved chunks instead of calling OpenAI. This lets the
 * Playwright suite drive the entire AI path — explanations + chat + citations —
 * with byte-stable results and zero network.
 */

export const MOCK_KEY_PREFIX = "sk-mock-";

export function isMockKey(key: string | null | undefined): boolean {
  return Boolean(key && key.startsWith(MOCK_KEY_PREFIX));
}

export function chatModel(apiKey: string): ChatOpenAI {
  return new ChatOpenAI({
    apiKey,
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
    temperature: 0.2,
    maxRetries: 1,
  });
}
