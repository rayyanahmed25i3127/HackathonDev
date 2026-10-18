
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, requireUser } from "@/lib/supabase/server";

const schema = z.object({
  employeeId: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { profile } = await requireUser(request);
    const { id } = await context.params;

    if (!["Owner", "Admin"].includes(profile.role)) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Permission denied" },
        { status: 403 }
      );
    }

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Invalid lead ID" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const { data, error } = await adminDb.rpc(
      "manual_reassign_lead",
      {
        p_lead_id: id,
        p_employee_id: parsed.data.employeeId,
        p_actor_id: profile.id,
      }
    );

    if (error) {
      console.error("Reassignment failed:", error);
      return NextResponse.json(
        { code: "REASSIGN_FAILED", message: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    const status =
      message === "UNAUTHORIZED" ? 401 :
      message === "PROFILE_NOT_FOUND" ? 403 : 500;

    return NextResponse.json(
      { code: status === 500 ? "SERVER_ERROR" : message },
      { status }
    );
  }
}
