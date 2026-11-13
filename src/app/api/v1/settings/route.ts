import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedDb, requireUser } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(1), address: z.string().min(1), phone: z.string().min(7),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/), closingTime: z.string().regex(/^\d{2}:\d{2}$/),
  closedWeekdays: z.array(z.number().int().min(0).max(6)), timezone: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const token = request.headers.get("authorization")!.slice(7);
    const db = authenticatedDb(token);
    const [settings, doctors, services] = await Promise.all([
      db.from("clinic_settings").select("*").eq("id", true).single(),
      db.from("doctors").select("id,display_name,specialty,qualifications,slot_minutes,max_patients_per_day,is_active").eq("is_active", true).order("display_name"),
      db.from("service_types").select("id,name,specialty,default_minutes,default_fee_paisa,is_active").eq("is_active", true).order("name"),
    ]);
    if (settings.error) throw settings.error;
    return NextResponse.json({ settings: settings.data, doctors: doctors.data ?? [], services: services.data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SERVER_ERROR";
    return NextResponse.json({ code: message }, { status: message === "UNAUTHORIZED" ? 401 : 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await requireUser(request);
    if (profile.role !== "receptionist") return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ code: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
    const v = parsed.data;
    const token = request.headers.get("authorization")!.slice(7);
    const db = authenticatedDb(token);
    const { data, error } = await db.from("clinic_settings").update({ name: v.name, address: v.address, phone: v.phone, opening_time: v.openingTime, closing_time: v.closingTime, closed_weekdays: v.closedWeekdays, timezone: v.timezone }).eq("id", true).select("*").single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "SERVER_ERROR";
    return NextResponse.json({ code: message }, { status: message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
