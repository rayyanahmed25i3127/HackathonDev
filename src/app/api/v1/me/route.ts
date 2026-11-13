import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await requireUser(request);
    return NextResponse.json({ user: { id: user.id, email: user.email }, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SERVER_ERROR";
    const status = message === "UNAUTHORIZED" ? 401 : message === "PROFILE_NOT_FOUND" ? 403 : 500;
    return NextResponse.json({ code: message, message }, { status });
  }
}
