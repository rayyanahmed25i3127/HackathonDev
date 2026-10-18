import "server-only";

import { randomUUID } from "node:crypto";
import { adminDb } from "@/lib/supabase/server";
import { sendLeadAlertEmail, type LeadAlertType } from "@/lib/integrations/resend";

const MAX_ATTEMPTS = 5;
const CLAIM_STALE_AFTER = "5 minutes";

type Job = {
  id: string;
  workspace_id: string;
  lead_id: string;
  recipient_id: string;
  event_type: string;
  attempts: number;
};

function safeFailure(message: string) {
  return message.length > 500 ? message.slice(0, 500) : message;
}

async function markFailure(job: Job, workerId: string, error: unknown) {
  const attempts = job.attempts + 1;
  const terminal = attempts >= MAX_ATTEMPTS;
  await adminDb
    .from("notification_jobs")
    .update({
      status: terminal ? "failed" : "pending",
      attempts,
      last_error: safeFailure(error instanceof Error ? error.message : "Notification failed."),
      claimed_at: null,
      claimed_by: null,
      next_attempt_at: new Date(Date.now() + Math.min(60 * 60_000, 2 ** attempts * 10_000)).toISOString(),
    })
    .eq("id", job.id)
    .eq("claimed_by", workerId);
}

export async function processLeadEscalationNotifications(limit = 10) {
  const workerId = process.env.NOTIFICATION_WORKER_ID?.trim() || randomUUID();
  const { data: jobs, error } = await adminDb.rpc("claim_notification_jobs", {
    p_worker_id: workerId,
    p_limit: Math.max(1, Math.min(100, Math.floor(limit))),
    p_stale_after: CLAIM_STALE_AFTER,
    p_max_attempts: MAX_ATTEMPTS,
  });
  if (error) throw new Error("Unable to claim notification jobs.");

  const results: Array<{ id: string; status: "sent" | "failed" }> = [];
  for (const job of (jobs ?? []) as Job[]) {
    try {
      if (job.event_type !== "LEAD_ESCALATED") throw new Error("Unsupported notification event.");
      const [{ data: recipient, error: recipientError }, { data: lead, error: leadError }] = await Promise.all([
        adminDb.auth.admin.getUserById(job.recipient_id),
        adminDb.from("leads").select("id, name, email, workspace_id, owner_id, deadline, escalations").eq("id", job.lead_id).eq("workspace_id", job.workspace_id).single(),
      ]);
      const email = recipientError ? null : recipient.user?.email;
      if (!email || leadError || !lead || lead.workspace_id !== job.workspace_id) {
        throw new Error("Notification recipient or lead is unavailable in this workspace.");
      }
      const sent = await sendLeadAlertEmail(
        email,
        lead.name,
        "overdue" as LeadAlertType,
        `Lead ${lead.name} requires escalation review.`,
        { idempotencyKey: `notification-job:${job.id}` },
      );
      const { error: updateError } = await adminDb
        .from("notification_jobs")
        .update({ status: "sent", sent_at: new Date().toISOString(), provider_id: sent.id, last_error: null, claimed_at: null, claimed_by: null })
        .eq("id", job.id)
        .eq("claimed_by", workerId);
      if (updateError) throw new Error("Notification status could not be saved.");
      results.push({ id: job.id, status: "sent" });
    } catch (error) {
      await markFailure(job, workerId, error);
      results.push({ id: job.id, status: "failed" });
    }
  }
  return { processed: results.length, results };
}
