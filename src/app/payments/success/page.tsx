"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type State = "pending" | "success" | "failure";

function PaymentSuccessContent() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId");
  const [state, setState] = useState<State>("failure");
  const [message, setMessage] = useState("Sign in to verify this payment from the CRM.");

  useEffect(() => {
    if (!paymentId) {
      setState("failure");
      setMessage("This payment link is missing its payment ID.");
    }
  }, [paymentId]);

  const retryUrl = paymentId
    ? `/payments/success?paymentId=${encodeURIComponent(paymentId)}`
    : "/payments/success";
  const signInUrl = `/login?returnTo=${encodeURIComponent(retryUrl)}`;

  return <main>
    <h1>{state === "success" ? "Payment successful" : state === "failure" ? "Sign in to verify payment" : "Payment pending"}</h1>
    <p>{message}</p>
    {paymentId ? <p>Payment reference: <code>{paymentId}</code></p> : null}
    <p><Link href={signInUrl}>Sign in to the CRM</Link></p>
    {paymentId ? <p><Link href={retryUrl}>Retry verification after signing in</Link></p> : null}
  </main>;
}

export default function PaymentSuccessPage() {
  return <Suspense fallback={<main><h1>Payment pending</h1><p>Loading payment status…</p></main>}><PaymentSuccessContent /></Suspense>;
}
