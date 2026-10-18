
import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireUser(request);

    let query = adminDb
      .from("recovery_queue")
      .select("*")
      .eq("workspace_id", profile.workspace_id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (profile.role === "User") {
      query = query.eq("owner_id", profile.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      items: data ?? [],
      total: data?.length ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHORIZED" ? 401 :
      message === "PROFILE_NOT_FOUND" ? 403 : 500;

    return NextResponse.json(
      { code: status === 500 ? "SERVER_ERROR" : message },
      { status }
    );
  }
}
