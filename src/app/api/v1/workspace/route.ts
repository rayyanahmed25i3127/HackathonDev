import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function countRows(
  table: "leads" | "recovery_queue",
  workspaceId: string,
  ownerId: string | null,
  status?: string
): Promise<number> {
  let query = adminDb
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (ownerId) query = query.eq("owner_id", ownerId);
  if (status) query = query.eq("status", status);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await requireUser(request);
    const workspaceId = profile.workspace_id;
    const ownerScope = profile.role === "User" ? profile.id : null;

    const [
      totalLeads,
      pendingAcknowledgement,
      acknowledgedLeads,
      unassignedLeads,
      recoveryLeads,
      teamResult,
    ] = await Promise.all([
      countRows("leads", workspaceId, ownerScope),
      countRows("leads", workspaceId, ownerScope, "pending_ack"),
      countRows("leads", workspaceId, ownerScope, "acknowledged"),
      countRows("leads", workspaceId, ownerScope, "unassigned"),
      countRows("recovery_queue", workspaceId, ownerScope),
      adminDb.from("profiles")
        .select("id, full_name, role, availability")
        .eq("workspace_id", workspaceId)
        .order("full_name", { ascending: true }),
    ]);

    if (teamResult.error) throw teamResult.error;

    return NextResponse.json({
      workspaceId,
      currentUser: {
        id: user.id,
        role: profile.role,
        fullName: profile.full_name,
        availability: profile.availability,
      },
      metrics: {
        totalLeads,
        pendingAcknowledgement,
        acknowledgedLeads,
        unassignedLeads,
        recoveryLeads,
      },
      team: teamResult.data ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHORIZED" ? 401
      : message === "PROFILE_NOT_FOUND" ? 403 : 500;
    if (status === 500) console.error("Workspace summary API error:", error);
    return NextResponse.json(
      { code: status === 500 ? "SERVER_ERROR" : message },
      { status }
    );
  }
}
