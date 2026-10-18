import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase/server";
import { exchangeGoogleCode, storeGoogleConnection } from "@/lib/integrations/google-calendar";
import { GOOGLE_STATE_COOKIE, verifyGoogleState } from "@/lib/integrations/google-oauth-state";

export const dynamic = "force-dynamic";

function trustedAppOrigin() {
  const configured = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  const fallback = process.env.GOOGLE_REDIRECT_URI?.trim() || "http://localhost:3000/api/integrations/google/callback";
  let value = configured || fallback;
  try {
    const url = new URL(value);
    if (url.hostname === "0.0.0.0" || url.hostname === "127.0.0.1") {
      return "http://localhost:3000";
    }
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      throw new Error("Invalid application URL");
    }
    return url.origin;
  } catch {
    return "http://localhost:3000";
  }
}

export async function GET(request: NextRequest) {
  let stage = "request";
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  const cookie = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
  const appOrigin = trustedAppOrigin();
  const failure = (failedStage: string) => {
    console.error("[google-oauth] callback failed", { stage: failedStage });
    return NextResponse.redirect(`${appOrigin}/integrations?google=error`);
  };
  if (oauthError) return failure("google-response");
  if (!state || !code) return failure("missing-callback-parameters");
  if (!cookie || state !== cookie) return failure("cookie-validation");
  try {
    stage = "state-validation";
    const decodedPayload = JSON.parse(Buffer.from(state.split(".")[0], "base64url").toString("utf8")) as { nonce?: string };
    const decoded = verifyGoogleState(state, decodedPayload.nonce ?? "");
    stage = "workspace-authorization";
    const { data: profile, error: profileError } = await adminDb.from("profiles").select("id, workspace_id, role").eq("id", decoded.userId).eq("workspace_id", decoded.workspaceId).single();
    if (profileError || !profile || !['Owner', 'Admin'].includes(profile.role)) return failure("workspace-authorization");
    stage = "token-exchange";
    const tokens = await exchangeGoogleCode(code);
    stage = "database-write";
    await storeGoogleConnection({ userId: profile.id, workspaceId: profile.workspace_id, ...tokens });
    stage = "database-verification";
    const { data: savedConnection, error: savedConnectionError } = await adminDb
      .from("google_calendar_connections")
      .select("user_id, workspace_id")
      .eq("user_id", profile.id)
      .eq("workspace_id", profile.workspace_id)
      .maybeSingle();
    if (savedConnectionError || !savedConnection) return failure("database-verification");
    const response = NextResponse.redirect(`${appOrigin}/integrations?google=connected`);
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    return response;
  } catch {
    return failure(stage);
  }
}
