import { NextRequest, NextResponse } from "next/server";
import { createSandboxCheckout } from "@/lib/integrations/safepay";
import { adminDb, requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const MAX_AMOUNT_PAISA = 100_000_000;

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireUser(request);
    const body = await request.json().catch(() => null) as { amountPaisa?: unknown; leadId?: unknown; contactId?: unknown } | null;
    const amountPaisa = body?.amountPaisa;
    const leadId = typeof body?.leadId === "string" ? body.leadId : null;
    const contactId = typeof body?.contactId === "string" ? body.contactId : null;
    if (!Number.isSafeInteger(amountPaisa) || (amountPaisa as number) < 100 || (amountPaisa as number) > MAX_AMOUNT_PAISA || (!leadId && !contactId) || (leadId && contactId)) {
      return NextResponse.json({ code: "INVALID_REQUEST", message: "Provide one linked lead or contact and a valid PKR amount in paisa." }, { status: 400 });
    }
    if (leadId) {
      const { data, error } = await adminDb.from("leads").select("id").eq("id", leadId).eq("workspace_id", profile.workspace_id).single();
      if (error || !data) return NextResponse.json({ code: "NOT_FOUND", message: "Lead not found in this workspace." }, { status: 404 });
    } else {
      const { data, error } = await adminDb.from("contacts").select("id").eq("id", contactId).eq("workspace_id", profile.workspace_id).single();
      if (error || !data) return NextResponse.json({ code: "NOT_FOUND", message: "Contact not found in this workspace." }, { status: 404 });
    }
    const { data: payment, error: insertError } = await adminDb.from("payments").insert({ workspace_id: profile.workspace_id, lead_id: leadId, contact_id: contactId, amount_paisa: amountPaisa, currency: "PKR", status: "pending", created_by: user.id }).select("id, amount_paisa, status").single();
    if (insertError || !payment) return NextResponse.json({ code: "SERVER_ERROR", message: "Unable to create payment." }, { status: 500 });
    const origin = request.nextUrl.origin;
    try {
      const checkout = await createSandboxCheckout({ amount: amountPaisa as number, currency: "PKR", orderId: payment.id, redirectUrl: `${origin}/payments/success?paymentId=${payment.id}`, cancelUrl: `${origin}/payments/cancel?paymentId=${payment.id}` });
      const { error: updateError } = await adminDb.from("payments").update({ safepay_tracker: checkout.trackerToken, updated_at: new Date().toISOString() }).eq("id", payment.id).eq("workspace_id", profile.workspace_id).eq("status", "pending");
      if (updateError) throw new Error("Payment could not be updated.");
      return NextResponse.json({ paymentId: payment.id, checkoutUrl: checkout.checkoutUrl, status: "pending" }, { status: 201 });
    } catch {
      await adminDb.from("payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", payment.id).eq("workspace_id", profile.workspace_id);
      return NextResponse.json({ code: "CHECKOUT_FAILED", message: "Safepay checkout could not be created." }, { status: 502 });
    }
  } catch (error) {
    const code = error instanceof Error && error.message === "UNAUTHORIZED" ? "UNAUTHORIZED" : "SERVER_ERROR";
    return NextResponse.json({ code, message: code === "UNAUTHORIZED" ? "Authentication required." : "Unable to create payment." }, { status: code === "UNAUTHORIZED" ? 401 : 500 });
  }
}
