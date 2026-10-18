import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase/server";
import { exchangeGoogleCode, storeGoogleConnection } from "@/lib/integrations/google-calendar";
import { GOOGLE_STATE_COOKIE, verifyGoogleState } from "@/lib/integrations/google-oauth-state";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  const cookie = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
  const failure = (message: string) => NextResponse.json({ code: "OAUTH_FAILED", message }, { status: 400 });
  if (oauthError || !state || !code || !cookie || state !== cookie) return failure("Google authorization was cancelled or invalid.");
  try {
    const decodedPayload = JSON.parse(Buffer.from(state.split(".")[0], "base64url").toString("utf8")) as { nonce?: string };
    const decoded = verifyGoogleState(state, decodedPayload.nonce ?? "");
    const { data: profile } = await adminDb.from("profiles").select("id, workspace_id, role").eq("id", decoded.userId).eq("workspace_id", decoded.workspaceId).single();
    if (!profile || !['Owner', 'Admin'].includes(profile.role)) return failure("Workspace permission required.");
    const tokens = await exchangeGoogleCode(code);
    await storeGoogleConnection({ userId: profile.id, workspaceId: profile.workspace_id, ...tokens });
    const response = NextResponse.json({ connected: true });
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    return response;
  } catch {
    return failure("Google authorization could not be completed.");
  }
}
