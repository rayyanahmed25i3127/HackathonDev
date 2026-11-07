import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, requireUser } from "@/lib/supabase/server";
import { normalizePkPhone, isValidCnic } from "@/lib/clinic";

const patientSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  guardianName: z.string().trim().max(160).optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional(),
  dateOfBirth: z.string().date().optional(),
  ageYears: z.number().int().min(0).max(130).optional(),
  phone: z.string().min(10).max(20),
  phoneAlt: z.string().max(20).optional().or(z.literal("")),
  whatsappNumber: z.string().max(20).optional().or(z.literal("")),
  whatsappOptIn: z.boolean().default(false),
  cnic: z.string().max(15).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  referredBy: z.string().trim().max(160).optional().or(z.literal("")),
  internalNotes: z.string().trim().max(2000).optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  if (!value.dateOfBirth && value.ageYears === undefined) {
    ctx.addIssue({ code: "custom", path: ["ageYears"], message: "Date of birth or age is required." });
  }
  if (value.cnic && !isValidCnic(value.cnic)) {
    ctx.addIssue({ code: "custom", path: ["cnic"], message: "CNIC must use #####-#######-# format." });
  }
});

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  const status = message === "UNAUTHORIZED" ? 401 : message === "PROFILE_NOT_FOUND" ? 403 : 500;
  return NextResponse.json({ code: status === 500 ? "SERVER_ERROR" : message, message: status === 500 ? "Request failed" : message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireUser(request);
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    let query = adminDb.from("patients").select("*").eq("is_archived", false).order("created_at", { ascending: false }).limit(100);
    if (search) query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,mrn.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ items: data ?? [], total: data?.length ?? 0, role: profile.role });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireUser(request);
    if (profile.role !== "receptionist") return NextResponse.json({ code: "FORBIDDEN", message: "Only receptionists can register patients." }, { status: 403 });
    const parsed = patientSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ code: "VALIDATION_ERROR", message: "Invalid patient details.", issues: parsed.error.issues }, { status: 400 });
    const value = parsed.data;
    const phone = normalizePkPhone(value.phone);
    const whatsappNumber = value.whatsappNumber ? normalizePkPhone(value.whatsappNumber) : phone;
    const phoneAlt = value.phoneAlt ? normalizePkPhone(value.phoneAlt) : null;
    const { data: duplicate } = await adminDb.from("patients").select("id, mrn, full_name, phone").eq("phone", phone).eq("is_archived", false).limit(5);
    if (value.cnic) {
      const { data: cnicMatch } = await adminDb.from("patients").select("id, mrn, full_name, phone").eq("cnic", value.cnic).eq("is_archived", false).limit(1);
      if (cnicMatch?.length) return NextResponse.json({ code: "DUPLICATE_CNIC", message: "A patient with this CNIC already exists.", matches: cnicMatch }, { status: 409 });
    }
    const { data: patient, error } = await adminDb.from("patients").insert({
      full_name: value.fullName, guardian_name: value.guardianName || null, gender: value.gender ?? null,
      date_of_birth: value.dateOfBirth ?? null, age_years: value.ageYears ?? null, phone, phone_alt: phoneAlt,
      whatsapp_number: whatsappNumber, whatsapp_opt_in: value.whatsappOptIn,
      whatsapp_opt_in_at: value.whatsappOptIn ? new Date().toISOString() : null, cnic: value.cnic || null,
      city: value.city || null, address: value.address || null, referred_by: value.referredBy || null,
      internal_notes: value.internalNotes || null, created_by: profile.id,
    }).select("*").single();
    if (error || !patient) throw error ?? new Error("Patient creation failed");
    return NextResponse.json({ patient, possibleDuplicates: duplicate ?? [] }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
