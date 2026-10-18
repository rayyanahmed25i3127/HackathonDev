import "server-only";

/**
 * Sandbox-only Express Checkout; importing this module makes no requests.
 * https://safepay-docs.netlify.app/build-your-integration/express-checkout/
 * https://safepay-docs.netlify.app/concepts/fetch-tracker/
 * https://github.com/getsafepay/node-core/blob/main/src/Checkout.ts
 * Requires native fetch and server-only support in the future Next.js project.
 */
const SANDBOX_HOST = "https://sandbox.api.getsafepay.com";

export type SafepayCurrency = "PKR" | "USD";

export interface SafepayCheckoutInput {
  /** Integer minor units: 10000 means PKR 100.00. Calculate on the server. */
  amount: number;
  currency: SafepayCurrency;
  orderId: string;
  /** Trusted application URLs supplied by server configuration. */
  redirectUrl: string;
  cancelUrl: string;
  /** Select the payment channel enabled on your sandbox account. */
  intent?: "CYBERSOURCE" | "MPGS";
}

export interface SafepayPaymentExpectation {
  /** Load these values from your saved order, never from redirect parameters. */
  trackerToken: string;
  amount: number;
  currency: SafepayCurrency;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Safepay returned an invalid response.");
  }
  return value as Record<string, unknown>;
}

function credentials() {
  const publicKey = process.env.SAFEPAY_PUBLIC_KEY?.trim();
  const secretKey = process.env.SAFEPAY_SECRET_KEY?.trim();
  if (!publicKey || !secretKey) {
    throw new Error("Configure SAFEPAY_PUBLIC_KEY and SAFEPAY_SECRET_KEY with sandbox credentials.");
  }
  return { publicKey, secretKey };
}

function validateMoney(amount: number, currency: SafepayCurrency) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Amount must be a positive safe integer in minor units.");
  }
  if (currency !== "PKR" && currency !== "USD") {
    throw new Error("Supported currencies are PKR and USD.");
  }
}

function validateReturnUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Checkout return URLs must be absolute URLs.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username || url.password
  ) {
    throw new Error("Use HTTPS return URLs, or HTTP on localhost for testing.");
  }
  return url.toString();
}

async function request(
  path: string,
  secretKey: string,
  body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(`${SANDBOX_HOST}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SFPY-MERCHANT-SECRET": secretKey,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // Do not expose request headers, credentials or the underlying error.
    // Never retry POSTs automatically: a timed-out request may have succeeded.
    throw new Error("Safepay request could not be confirmed. Check the sandbox dashboard before retrying.");
  }
  if (!response.ok) {
    throw new Error(`Safepay sandbox request failed (HTTP ${response.status}).`);
  }
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    throw new Error("Safepay returned unreadable JSON. Check the sandbox dashboard before retrying.");
  }
  const result = record(parsed);
  const status = result.status === undefined ? undefined : record(result.status);
  if (
    result.ok === false ||
    (status?.errors !== undefined &&
      (!Array.isArray(status.errors) || status.errors.length > 0))
  ) {
    throw new Error("Safepay reported an unsuccessful sandbox request.");
  }
  return result;
}

function trackerFrom(result: Record<string, unknown>) {
  const data = record(result.data);
  // Both shapes appear in Safepay's Express Checkout and Fetch Tracker docs.
  return data.tracker === undefined ? data : record(data.tracker);
}

function checkTracker(
  tracker: Record<string, unknown>,
  expected: SafepayPaymentExpectation,
  publicKey: string,
) {
  const client = typeof tracker.client === "string"
    ? tracker.client
    : record(tracker.client).api_key;
  const quote = record(record(tracker.purchase_totals).quote_amount);
  if (
    tracker.environment !== "sandbox" ||
    tracker.mode !== "payment" ||
    tracker.token !== expected.trackerToken ||
    client !== publicKey ||
    quote.amount !== expected.amount ||
    quote.currency !== expected.currency ||
    typeof tracker.state !== "string"
  ) {
    throw new Error("Safepay payment does not match the expected sandbox order.");
  }
}

/**
 * Creates a tracker and short-lived checkout URL. Persist trackerToken against
 * orderId with amount/currency before redirecting. Treat checkoutUrl as sensitive
 * (it contains a short-lived authentication token); do not log it.
 */
export async function createSandboxCheckout(
  input: SafepayCheckoutInput,
): Promise<{ trackerToken: string; checkoutUrl: string }> {
  validateMoney(input.amount, input.currency);
  if (!input.orderId.trim()) throw new Error("Order ID is required.");
  const intent = input.intent ?? "CYBERSOURCE";
  if (intent !== "CYBERSOURCE" && intent !== "MPGS") {
    throw new Error("Unsupported payment channel.");
  }
  const redirectUrl = validateReturnUrl(input.redirectUrl);
  const cancelUrl = validateReturnUrl(input.cancelUrl);
  const { publicKey, secretKey } = credentials();
  const session = await request("/order/payments/v3/", secretKey, {
    merchant_api_key: publicKey,
    intent,
    mode: "payment",
    entry_mode: "raw",
    currency: input.currency,
    amount: input.amount,
    metadata: { order_id: input.orderId.trim() },
    include_fees: false,
  });
  const tracker = trackerFrom(session);
  if (typeof tracker.token !== "string" || !/^track_[a-zA-Z0-9-]+$/.test(tracker.token)) {
    throw new Error("Safepay returned an invalid tracker token.");
  }
  const trackerToken = tracker.token;
  checkTracker(tracker, { trackerToken, amount: input.amount, currency: input.currency }, publicKey);
  const passport = await request("/client/passport/v1/token", secretKey, {});
  if (typeof passport.data !== "string" || !passport.data) {
    throw new Error("Safepay returned an invalid checkout authentication token.");
  }
  const url = new URL("/embedded/", SANDBOX_HOST);
  url.search = new URLSearchParams({
    environment: "sandbox",
    tracker: trackerToken,
    tbt: passport.data,
    source: "hosted",
    redirect_url: redirectUrl,
    cancel_url: cancelUrl,
  }).toString();
  return { trackerToken, checkoutUrl: url.toString() };
}

/**
 * Authenticated reporter lookup; a success redirect alone is not proof of payment.
 * Caller must load the expected tracker/amount/currency from its own order store,
 * authorize access to that order, and apply paid updates idempotently.
 * Webhook reception/signature verification is separate and is not implemented here.
 */
export async function verifySandboxPayment(
  expected: SafepayPaymentExpectation,
): Promise<{ trackerToken: string; state: string; paid: boolean }> {
  validateMoney(expected.amount, expected.currency);
  if (!/^track_[a-zA-Z0-9-]+$/.test(expected.trackerToken)) {
    throw new Error("Invalid tracker token.");
  }
  const { publicKey, secretKey } = credentials();
  const result = await request(
    `/reporter/api/v1/payments/${encodeURIComponent(expected.trackerToken)}`,
    secretKey,
  );
  const tracker = trackerFrom(result);
  checkTracker(tracker, expected, publicKey);
  const state = tracker.state as string;
  return { trackerToken: expected.trackerToken, state, paid: state === "TRACKER_ENDED" };
}
