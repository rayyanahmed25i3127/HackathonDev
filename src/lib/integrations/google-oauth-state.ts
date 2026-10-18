import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const GOOGLE_STATE_COOKIE = "google_oauth_state";
const maxAgeSeconds = 600;

function secret() {
  const value = process.env.GOOGLE_CLIENT_SECRET;
  if (!value) throw new Error("Google OAuth is not configured.");
  return value;
}

export function createGoogleState(userId: string, workspaceId: string) {
  const nonce = randomBytes(32).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ nonce, userId, workspaceId, exp: Date.now() + maxAgeSeconds * 1000 })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return { value: `${payload}.${signature}`, nonce, maxAge: maxAgeSeconds };
}

export function verifyGoogleState(value: string, expectedNonce: string) {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) throw new Error("Invalid OAuth state.");
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("Invalid OAuth state.");
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { nonce?: string; userId?: string; workspaceId?: string; exp?: number };
  if (!decoded.nonce || decoded.nonce !== expectedNonce || !decoded.userId || !decoded.workspaceId || !decoded.exp || decoded.exp < Date.now()) throw new Error("Expired or invalid OAuth state.");
  return decoded;
}
