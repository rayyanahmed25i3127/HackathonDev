
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, requireUser } from "@/lib/supabase/server";

const availabilitySchema = z.object({
  availability: z.enum([
    "Available",
    "Busy",
    "On leave",
    "Offline",
  ]),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { profile } = await requireUser(request);
    const { id } = await context.params;

    // Employees can update themselves.
    // Owner and Admin can update other employees.
    if (
      profile.id !== id &&
      !["Owner", "Admin"].includes(profile.role)
    ) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "Permission denied",
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = availabilitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    // Verify employee belongs to the same workspace
    const { data: employee, error: lookupError } = await adminDb
      .from("profiles")
      .select("id, workspace_id, role")
      .eq("id", id)
      .eq("workspace_id", profile.workspace_id)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (!employee) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "Employee not found",
        },
        { status: 404 }
      );
    }

    // Admin cannot change Owner
    if (
      employee.role === "Owner" &&
      profile.id !== id &&
      profile.role !== "Owner"
    ) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "Cannot modify the Owner",
        },
        { status: 403 }
      );
    }

    // Update availability and reassign unacknowledged leads
    const { data: reassigned, error } = await adminDb.rpc(
      "update_employee_availability",
      {
        p_employee_id: id,
        p_status: parsed.data.availability,
      }
    );

    if (error) throw error;

    return NextResponse.json({
      success: true,
      employeeId: id,
      availability: parsed.data.availability,
      leadsProcessed: reassigned,
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
      },
      { status }
    );
  }
}
