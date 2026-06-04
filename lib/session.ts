import { cookies } from "next/headers";
import { BYOK_COOKIE, decryptKey } from "./byok";

/** Read and decrypt the visitor's OpenAI key from the HttpOnly cookie, if any. */
export async function getSessionApiKey(): Promise<string | null> {
  const store = await cookies();
  return decryptKey(store.get(BYOK_COOKIE)?.value);
}
