import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireUser(request);

    // Restrict workspace-wide audit history until finer-grained permissions exist.
    if (profile.role !== "Owner" && profile.role !== "Admin") {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Audit history requires an Owner or Admin role" },
        { status: 403 }
      );
    }

    const params = request.nextUrl.searchParams;
    const rawLimit = Number(params.get("limit") ?? 50);
    const rawPage = Number(params.get("page") ?? 0);
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(100, Math.floor(rawLimit))) : 50;
    const page = Number.isFinite(rawPage)
      ? Math.max(0, Math.floor(rawPage)) : 0;

    let query = adminDb
      .from("activity_logs")
      .select("*", { count: "exact" })
      .eq("workspace_id", profile.workspace_id)
      .order("created_at", { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    const leadId = params.get("leadId");
    if (leadId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: "Invalid lead ID" },
          { status: 400 }
        );
      }
      query = query.eq("lead_id", leadId);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      items: data ?? [],
      total: count ?? 0,
      nextCursor: (page + 1) * limit < (count ?? 0) ? String(page + 1) : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHORIZED" ? 401
      : message === "PROFILE_NOT_FOUND" ? 403 : 500;
    if (status === 500) console.error("Activity API error:", error);
    return NextResponse.json(
      { code: status === 500 ? "SERVER_ERROR" : message },
      { status }
    );
  }
}
