import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { createGoogleState } from "@/lib/integrations/google-oauth-state";
import { googleAuthorizationUrl } from "@/lib/integrations/google-calendar";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireUser(request);
    if (!['Owner', 'Admin'].includes(profile.role)) return NextResponse.json({ code: "FORBIDDEN", message: "Workspace admin permission required." }, { status: 403 });
    const state = createGoogleState(profile.id, profile.workspace_id);
    const response = NextResponse.json({ authorizationUrl: googleAuthorizationUrl(state.value) });
    response.cookies.set("google_oauth_state", state.value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/integrations/google", maxAge: state.maxAge });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ code: message === "UNAUTHORIZED" ? "UNAUTHORIZED" : "SERVER_ERROR", message: message === "UNAUTHORIZED" ? "Authentication required." : "Unable to start Google authorization." }, { status: message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
