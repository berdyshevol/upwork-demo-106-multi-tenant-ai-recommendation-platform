import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BYOK_COOKIE, encryptKey, looksLikeOpenAIKey } from "@/lib/byok";

export const runtime = "nodejs";

/**
 * BYOK key management.
 *   GET    → { hasKey }                      (does the session have a key cookie?)
 *   POST   → { key } stored encrypted in an HttpOnly cookie
 *   DELETE → clears the cookie
 *
 * The key is AES-256-GCM encrypted before it ever touches Set-Cookie, the cookie
 * is HttpOnly (unreadable from JS), and the plaintext is never returned to the
 * client. The owner's account is never billed — only the visitor's key is used.
 */

export async function GET() {
  const store = await cookies();
  const has = Boolean(store.get(BYOK_COOKIE)?.value);
  return NextResponse.json({ hasKey: has });
}

export async function POST(req: Request) {
  let key: unknown;
  try {
    ({ key } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof key !== "string" || !looksLikeOpenAIKey(key)) {
    return NextResponse.json(
      { error: "That doesn't look like an OpenAI key (expected sk-...)." },
      { status: 400 },
    );
  }
  const store = await cookies();
  store.set(BYOK_COOKIE, encryptKey(key.trim()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(BYOK_COOKIE);
  return NextResponse.json({ ok: true });
}
