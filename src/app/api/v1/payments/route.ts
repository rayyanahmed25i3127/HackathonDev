import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireUser(request);
    const { data, error } = await adminDb.from("payments").select("id, lead_id, contact_id, amount_paisa, currency, status, safepay_tracker, created_at, updated_at, paid_at").eq("workspace_id", profile.workspace_id).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json({ code: unauthorized ? "UNAUTHORIZED" : "SERVER_ERROR", message: unauthorized ? "Authentication required." : "Unable to retrieve payments." }, { status: unauthorized ? 401 : 500 });
  }
}
