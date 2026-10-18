
import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET: Fetch leads from Supabase
export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireUser(request);

    const rawLimit = Number(
      request.nextUrl.searchParams.get("limit") ?? 25
    );

    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(100, Math.floor(rawLimit)))
      : 25;

    let query = adminDb
      .from("leads")
      .select("*", { count: "exact" })
      .eq("workspace_id", profile.workspace_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Regular employees only see their assigned leads
    if (profile.role === "User") {
      query = query.eq("owner_id", profile.id);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      items: data ?? [],
      total: count ?? 0,
      nextCursor: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    const status =
      message === "UNAUTHORIZED" ? 401 :
      message === "PROFILE_NOT_FOUND" ? 403 : 500;

    return NextResponse.json(
      {
        code: status === 500 ? "SERVER_ERROR" : message,
        message:
          status === 500
            ? "Unable to retrieve leads."
            : "Authentication or access failed.",
      },
      { status }
    );
  }
}
