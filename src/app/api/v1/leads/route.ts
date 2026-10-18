
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const createLeadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  source: z.enum([
    "manual",
    "web_form",
    "whatsapp",
    "sms",
  ]).default("manual"),
});

function handleError(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "UNAUTHORIZED") {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Login required" },
      { status: 401 }
    );
  }

  if (message === "PROFILE_NOT_FOUND") {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "Profile not found" },
      { status: 403 }
    );
  }

  console.error("Leads API error:", error);

  return NextResponse.json(
    { code: "SERVER_ERROR", message: "Request failed" },
    { status: 500 }
  );
}

// GET: Fetch leads from Supabase
export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireUser(request);

    const params = request.nextUrl.searchParams;
    const rawLimit = Number(params.get("limit") ?? 25);
    const rawPage = Number(params.get("page") ?? 0);

    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(100, Math.floor(rawLimit)))
      : 25;

    const page = Number.isFinite(rawPage)
      ? Math.max(0, Math.floor(rawPage))
      : 0;

    let query = adminDb
      .from("leads")
      .select("*", { count: "exact" })
      .eq("workspace_id", profile.workspace_id)
      .order("created_at", { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (profile.role === "User") {
      query = query.eq("owner_id", profile.id);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      items: data ?? [],
      total: count ?? 0,
      nextCursor:
        (page + 1) * limit < (count ?? 0)
          ? String(page + 1)
          : null,
    });
  } catch (error) {
    return handleError(error);
  }
}

// POST: Create and automatically assign a lead
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireUser(request);

    const body = await request.json().catch(() => null);
    const parsed = createLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid lead details",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Save the lead in the authenticated workspace
    const { data: lead, error: insertError } = await adminDb
      .from("leads")
      .insert({
        workspace_id: profile.workspace_id,
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        source: input.source,
        status: "unassigned",
      })
      .select("*")
      .single();

    if (insertError || !lead) {
      throw insertError ?? new Error("Lead creation failed");
    }

    // Execute PostgreSQL round-robin assignment
    const { error: assignmentError } = await adminDb.rpc(
      "assign_lead",
      { p_lead_id: lead.id }
    );

    if (assignmentError) {
      console.error("Assignment failed:", assignmentError);

      return NextResponse.json(
        {
          code: "ASSIGNMENT_PENDING",
          message: "Lead saved but assignment needs attention",
          leadId: lead.id,
        },
        { status: 202 }
      );
    }

    // Return the final database record
    const { data: updated, error: readError } = await adminDb
      .from("leads")
      .select("*")
      .eq("id", lead.id)
      .eq("workspace_id", profile.workspace_id)
      .single();

    if (readError || !updated) {
      throw readError ?? new Error("Lead lookup failed");
    }

    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
