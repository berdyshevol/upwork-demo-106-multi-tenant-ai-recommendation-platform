import type {
  Answers,
  ChatResponse,
  Citation,
  RecommendResponse,
} from "./types";

/**
 * Typed browser → API client. The UI talks to the backend exclusively through
 * these functions; all of them are tenant-aware and surface the BYOK gate via
 * the `NO_KEY` sentinel so the UI can show the "add your OpenAI key" hint.
 */

export const NO_KEY = "NO_KEY" as const;

export async function fetchRecommendations(
  tenant: string,
  answers: Answers,
): Promise<RecommendResponse> {
  const res = await fetch("/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenant, answers }),
  });
  if (!res.ok) throw new Error(`recommend failed: ${res.status}`);
  return (await res.json()) as RecommendResponse;
}

export type ChatResult =
  | { ok: true; data: ChatResponse }
  | { ok: false; code: typeof NO_KEY | "ERROR"; message: string };

export async function sendChatMessage(
  tenant: string,
  message: string,
  providerIds: string[],
  history: { role: "user" | "assistant"; content: string }[],
): Promise<ChatResult> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenant, message, providerIds, history }),
  });
  if (res.status === 428) return { ok: false, code: NO_KEY, message: "OpenAI key required" };
  if (!res.ok) return { ok: false, code: "ERROR", message: `chat failed: ${res.status}` };
  return { ok: true, data: (await res.json()) as ChatResponse };
}

export async function getKeyStatus(): Promise<{ hasKey: boolean }> {
  const res = await fetch("/api/settings/key", { method: "GET" });
  if (!res.ok) return { hasKey: false };
  return (await res.json()) as { hasKey: boolean };
}

export async function saveKey(key: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/settings/key", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? "Could not save key" };
  }
  return { ok: true };
}

export async function clearKey(): Promise<void> {
  await fetch("/api/settings/key", { method: "DELETE" });
}

export type { Citation };
