
import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireUser } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { profile } = await requireUser(request);
    const { id } = await context.params;

    const { data: lead, error } = await adminDb
      .from("leads")
      .select("id, owner_id, status")
      .eq("id", id)
      .eq("workspace_id", profile.workspace_id)
      .maybeSingle();

    if (error) throw error;

    if (!lead) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Lead not found" },
        { status: 404 }
      );
    }

    if (lead.owner_id !== profile.id) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Not assigned to you" },
        { status: 403 }
      );
    }

    if (lead.status === "acknowledged") {
      return NextResponse.json(lead);
    }

    const { error: rpcError } = await adminDb.rpc(
      "acknowledge_lead",
      { p_lead_id: id, p_employee_id: profile.id }
    );

    if (rpcError) {
      return NextResponse.json(
        { code: "ACK_FAILED", message: rpcError.message },
        { status: 409 }
      );
    }

    const { data: updated, error: readError } = await adminDb
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", profile.workspace_id)
      .single();

    if (readError) throw readError;

    return NextResponse.json(updated);
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
