"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

type State = "pending" | "success" | "failure";

function PaymentSuccessContent() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId");
  const [state, setState] = useState<State>("pending");
  const [message, setMessage] = useState("Verifying your payment with Safepay…");

  useEffect(() => {
    if (!paymentId) {
      setState("failure");
      setMessage("This payment link is missing its payment ID.");
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (!cancelled) {
          setState("failure");
          setMessage("Please sign in to verify this payment from the CRM.");
        }
        return;
      }
      try {
        const response = await fetch(`/api/v1/payments/${encodeURIComponent(paymentId)}/verify`, {
          method: "POST",
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        const result = (await response.json().catch(() => ({}))) as { status?: string; message?: string };
        if (!response.ok) throw new Error(result.message || "Payment verification failed.");
        if (!cancelled) {
          const paid = result.status === "paid" || result.status === "succeeded";
          setState(paid ? "success" : "pending");
          setMessage(paid ? "Safepay confirmed this payment." : "Safepay has not confirmed this payment yet.");
        }
      } catch (error) {
        if (!cancelled) {
          setState("failure");
          setMessage(error instanceof Error ? error.message : "Payment verification failed.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [paymentId]);

  const retryUrl = paymentId
    ? `/payments/success?paymentId=${encodeURIComponent(paymentId)}`
    : "/payments/success";
  const signInUrl = `/login?returnTo=${encodeURIComponent(retryUrl)}`;

  return <main>
    <h1>{state === "success" ? "Payment successful" : state === "failure" ? "Sign in to verify payment" : "Payment pending"}</h1>
    <p>{message}</p>
    {paymentId ? <p>Payment reference: <code>{paymentId}</code></p> : null}
    {state === "failure" ? <p><Link href={signInUrl}>Sign in to the CRM</Link></p> : null}
    {paymentId ? <p><Link href={retryUrl}>Retry verification after signing in</Link></p> : null}
  </main>;
}

export default function PaymentSuccessPage() {
  return <Suspense fallback={<main><h1>Payment pending</h1><p>Loading payment status…</p></main>}><PaymentSuccessContent /></Suspense>;
}
