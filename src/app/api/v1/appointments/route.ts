import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, requireUser } from "@/lib/supabase/server";

const appointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
});

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  const status = message === "UNAUTHORIZED" ? 401 : message === "PROFILE_NOT_FOUND" ? 403 : 500;
  return NextResponse.json({ code: status === 500 ? "SERVER_ERROR" : message, message: status === 500 ? "Request failed" : message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");
    let query = adminDb.from("appointments").select("*, patients(id,mrn,full_name,phone), doctors(id,display_name,specialty), service_types(id,name)").order("start_at", { ascending: true }).limit(200);
    if (from) query = query.gte("start_at", from);
    if (to) query = query.lt("start_at", to);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ items: data ?? [], total: data?.length ?? 0 });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireUser(request);
    if (profile.role !== "receptionist") return NextResponse.json({ code: "FORBIDDEN", message: "Only receptionists can book appointments." }, { status: 403 });
    const parsed = appointmentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ code: "VALIDATION_ERROR", message: "Invalid appointment details.", issues: parsed.error.issues }, { status: 400 });
    const value = parsed.data;
    if (new Date(value.endAt) <= new Date(value.startAt)) return NextResponse.json({ code: "VALIDATION_ERROR", message: "End time must be after start time." }, { status: 400 });
    const { data: conflict } = await adminDb.from("appointments").select("id").eq("doctor_id", value.doctorId).not("status", "in", "(cancelled,no_show)").lt("start_at", value.endAt).gt("end_at", value.startAt).limit(1);
    if (conflict?.length) return NextResponse.json({ code: "APPOINTMENT_CONFLICT", message: "This doctor already has an appointment in that time range." }, { status: 409 });
    const { data, error } = await adminDb.from("appointments").insert({ patient_id: value.patientId, doctor_id: value.doctorId, service_type_id: value.serviceTypeId, start_at: value.startAt, end_at: value.endAt, reason: value.reason ?? null, notes: value.notes ?? null, created_by: profile.id }).select("*, patients(id,mrn,full_name), doctors(id,display_name,specialty), service_types(id,name)").single();
    if (error || !data) throw error ?? new Error("Appointment creation failed");
    return NextResponse.json(data, { status: 201 });
  } catch (error) { return failure(error); }
}
