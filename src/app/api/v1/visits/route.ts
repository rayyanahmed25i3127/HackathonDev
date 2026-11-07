import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, requireUser } from "@/lib/supabase/server";

const visitSchema = z.object({ patientId: z.string().uuid(), doctorId: z.string().uuid(), appointmentId: z.string().uuid().optional(), visitDate: z.string().date(), serviceTypeId: z.string().uuid(), reason: z.string().trim().max(500).optional(), status: z.enum(["pending", "waiting"]).default("pending") });
const statusSchema = z.object({ status: z.enum(["pending", "waiting", "in_consultation", "done", "cancelled", "no_show"]) });

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  const status = message === "UNAUTHORIZED" ? 401 : message === "PROFILE_NOT_FOUND" ? 403 : 500;
  return NextResponse.json({ code: status === 500 ? "SERVER_ERROR" : message, message: status === 500 ? "Request failed" : message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const date = request.nextUrl.searchParams.get("date") ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
    const doctorId = request.nextUrl.searchParams.get("doctorId");
    let query = adminDb.from("visits").select("*, patients(id,mrn,full_name,phone,gender,age_years,date_of_birth), doctors(id,display_name,specialty), service_types(id,name)").eq("visit_date", date).order("token_number", { ascending: true });
    if (doctorId) query = query.eq("doctor_id", doctorId);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ items: data ?? [], total: data?.length ?? 0 });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireUser(request);
    if (profile.role !== "receptionist") return NextResponse.json({ code: "FORBIDDEN", message: "Only receptionists can add patients to the queue." }, { status: 403 });
    const parsed = visitSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ code: "VALIDATION_ERROR", message: "Invalid visit details.", issues: parsed.error.issues }, { status: 400 });
    const value = parsed.data;
    const { data: open } = await adminDb.from("visits").select("id,token_number,status").eq("patient_id", value.patientId).eq("doctor_id", value.doctorId).eq("visit_date", value.visitDate).not("status", "in", "(done,cancelled,no_show)").limit(1);
    if (open?.length) return NextResponse.json({ code: "DUPLICATE_VISIT", message: "This patient already has an open visit with this doctor today.", visit: open[0] }, { status: 409 });
    const { data: latest } = await adminDb.from("visits").select("token_number").eq("doctor_id", value.doctorId).eq("visit_date", value.visitDate).order("token_number", { ascending: false }).limit(1);
    const token = (latest?.[0]?.token_number ?? 0) + 1;
    const { data, error } = await adminDb.from("visits").insert({ patient_id: value.patientId, doctor_id: value.doctorId, appointment_id: value.appointmentId ?? null, visit_date: value.visitDate, token_number: token, service_type_id: value.serviceTypeId, reason: value.reason ?? null, status: value.status, status_changed_by: profile.id, created_by: profile.id, checked_in_at: value.status === "waiting" ? new Date().toISOString() : null }).select("*, patients(id,mrn,full_name), doctors(id,display_name,specialty), service_types(id,name)").single();
    if (error || !data) throw error ?? new Error("Visit creation failed");
    return NextResponse.json(data, { status: 201 });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await requireUser(request);
    const visitId = request.nextUrl.searchParams.get("id");
    if (!visitId) return NextResponse.json({ code: "VALIDATION_ERROR", message: "Visit id is required." }, { status: 400 });
    const parsed = statusSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ code: "VALIDATION_ERROR", message: "Invalid visit status." }, { status: 400 });
    const { data: visit, error: readError } = await adminDb.from("visits").select("*").eq("id", visitId).single();
    if (readError || !visit) return NextResponse.json({ code: "NOT_FOUND", message: "Visit not found." }, { status: 404 });
    if (profile.role === "doctor") {
      const { data: doctor } = await adminDb.from("doctors").select("id").eq("profile_id", profile.id).eq("id", visit.doctor_id).maybeSingle();
      if (!doctor || !["waiting", "in_consultation", "done"].includes(parsed.data.status)) return NextResponse.json({ code: "FORBIDDEN", message: "Doctors can only update their own visit statuses." }, { status: 403 });
    }
    if (profile.role !== "doctor" && profile.role !== "receptionist") return NextResponse.json({ code: "FORBIDDEN", message: "Permission denied." }, { status: 403 });
    const now = new Date().toISOString();
    const status = parsed.data.status;
    const patch: Record<string, unknown> = { status, status_changed_at: now, status_changed_by: profile.id };
    if (status === "waiting" && !visit.checked_in_at) patch.checked_in_at = now;
    if (status === "in_consultation") patch.consultation_started_at = visit.consultation_started_at ?? now;
    if (status === "done") patch.completed_at = now;
    const { data, error } = await adminDb.from("visits").update(patch).eq("id", visitId).select("*").single();
    if (error || !data) throw error ?? new Error("Visit update failed");
    await adminDb.from("visit_status_events").insert({ visit_id: visitId, from_status: visit.status, to_status: status, changed_by: profile.id });
    return NextResponse.json(data);
  } catch (error) { return failure(error); }
}
