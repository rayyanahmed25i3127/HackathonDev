import { NextRequest, NextResponse } from "next/server";
import { processLeadEscalationNotifications } from "@/lib/notifications/worker";

export const dynamic = "force-dynamic";

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function POST(request: NextRequest) {
  const expected = process.env.NOTIFICATION_WORKER_SECRET?.trim();
  const provided = request.headers.get("x-notification-worker-secret") ?? "";
  if (!expected || !constantTimeEqual(provided, expected)) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "Worker authentication failed." }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const limit = typeof body.limit === "number" ? body.limit : 10;
    return NextResponse.json(await processLeadEscalationNotifications(limit));
  } catch {
    return NextResponse.json({ code: "WORKER_ERROR", message: "Notification worker failed." }, { status: 500 });
  }
}
