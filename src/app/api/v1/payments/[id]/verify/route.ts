import { NextRequest, NextResponse } from "next/server";
import { verifySandboxPayment } from "@/lib/integrations/safepay";
import { adminDb, requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireUser(request);
    const { id } = await context.params;
    const { data: payment, error } = await adminDb.from("payments").select("id, workspace_id, amount_paisa, currency, status, safepay_tracker").eq("id", id).eq("workspace_id", profile.workspace_id).single();
    if (error || !payment) return NextResponse.json({ code: "NOT_FOUND", message: "Payment not found." }, { status: 404 });
    if (!payment.safepay_tracker) return NextResponse.json({ code: "INVALID_PAYMENT", message: "Payment has no Safepay tracker." }, { status: 409 });
    if (payment.status === "paid") return NextResponse.json({ paymentId: id, status: "paid", paid: true });
    const result = await verifySandboxPayment({ trackerToken: payment.safepay_tracker, amount: payment.amount_paisa, currency: "PKR" });
    const nextStatus = result.paid ? "paid" : ["TRACKER_CANCELLED", "TRACKER_EXPIRED", "TRACKER_VOIDED", "TRACKER_REFUNDED"].includes(result.state) ? "failed" : "pending";
    if (nextStatus !== payment.status || result.paid) {
      const { error: updateError } = await adminDb.from("payments").update({ status: nextStatus, paid_at: result.paid ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", profile.workspace_id).neq("status", "paid");
      if (updateError) throw updateError;
    }
    return NextResponse.json({ paymentId: id, status: nextStatus, paid: result.paid, trackerState: result.state });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json({ code: unauthorized ? "UNAUTHORIZED" : "VERIFICATION_FAILED", message: unauthorized ? "Authentication required." : "Unable to verify payment." }, { status: unauthorized ? 401 : 502 });
  }
}
