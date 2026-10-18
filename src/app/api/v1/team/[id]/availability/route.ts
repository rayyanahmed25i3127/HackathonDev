
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, requireUser } from "@/lib/supabase/server";

const schema = z.object({
  availability: z.enum([
    "Available", "Busy", "On leave", "Offline"
  ])
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { profile } = await requireUser(request);
    const { id } = await context.params;

    if (
      profile.id !== id &&
      !["Owner", "Admin"].includes(profile.role)
    ) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Permission denied" },
        { status: 403 }
      );
    }

    const parsed = schema.safeParse(
      await request.json().catch(() => null)
    );

    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { data: employee, error: lookupError } = await adminDb
      .from("profiles")
      .select("id, workspace_id, role")
      .eq("id", id)
      .eq("workspace_id", profile.workspace_id)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (!employee || (
      employee.role === "Owner" &&
      profile.id !== id &&
      profile.role !== "Owner"
    )) {
      return NextResponse.json(
        { code: "NOT_FOUND_OR_FORBIDDEN" },
        { status: 403 }
      );
    }

    const { data: reassigned, error } = await adminDb.rpc(
      "update_employee_availability",
      {
        p_employee_id: id,
        p_status: parsed.data.availability
      }
    );

    if (error) throw error;

    return NextResponse.json({
      success: true,
      employeeId: id,
      availability: parsed.data.availability,
      leadsProcessed: reassigned
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
