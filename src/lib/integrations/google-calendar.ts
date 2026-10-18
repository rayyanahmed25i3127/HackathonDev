import "server-only";

import { adminDb } from "@/lib/supabase/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export type CalendarEventInput = {
  title: string;
  startTime: string;
  endTime: string;
  timezone: string;
  description?: string;
};

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth is not configured.");
  }
  return { clientId, clientSecret, redirectUri };
}

function safeError(message: string): never {
  throw new Error(message);
}

async function tokenRequest(body: URLSearchParams) {
  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return safeError("Google token request could not be confirmed.");
  }
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !payload) return safeError("Google token request failed.");
  return payload;
}

export async function exchangeGoogleCode(code: string) {
  const { clientId, clientSecret, redirectUri } = config();
  const payload = await tokenRequest(new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  }));
  if (typeof payload.access_token !== "string") return safeError("Google did not return an access token.");
  return {
    accessToken: payload.access_token,
    refreshToken: typeof payload.refresh_token === "string" ? payload.refresh_token : null,
    expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : 3600,
    scope: typeof payload.scope === "string" ? payload.scope : GOOGLE_CALENDAR_SCOPE,
  };
}

async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = config();
  const payload = await tokenRequest(new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  }));
  if (typeof payload.access_token !== "string") return safeError("Google refresh token was rejected.");
  return { accessToken: payload.access_token, expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : 3600 };
}

async function authorizedToken(userId: string, workspaceId: string) {
  const { data, error } = await adminDb
    .from("google_calendar_connections")
    .select("access_token, refresh_token, expires_at, revoked_at")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error || !data || data.revoked_at) return safeError("Google Calendar is not connected.");
  if (new Date(data.expires_at).getTime() > Date.now() + 60_000) return data.access_token as string;
  if (!data.refresh_token) return safeError("Google Calendar authorization has expired.");
  const refreshed = await refreshAccessToken(data.refresh_token);
  const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000).toISOString();
  const { error: updateError } = await adminDb
    .from("google_calendar_connections")
    .update({ access_token: refreshed.accessToken, expires_at: expiresAt })
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId);
  if (updateError) return safeError("Google Calendar token refresh could not be saved.");
  return refreshed.accessToken;
}

export async function createGoogleCalendarEvent(
  userId: string,
  workspaceId: string,
  input: CalendarEventInput,
) {
  if (!input.title.trim() || !input.timezone.trim()) throw new Error("Title and timezone are required.");
  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error("A valid start time before the end time is required.");
  }
  const accessToken = await authorizedToken(userId, workspaceId);
  let response: Response;
  try {
    response = await fetch(GOOGLE_EVENTS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: input.title.trim(),
        description: input.description?.trim() || undefined,
        start: { dateTime: start.toISOString(), timeZone: input.timezone },
        end: { dateTime: end.toISOString(), timeZone: input.timezone },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return safeError("Google Calendar request could not be confirmed.");
  }
  if (response.status === 401) return safeError("Google Calendar authorization was rejected or revoked.");
  if (!response.ok) return safeError("Google Calendar rejected the event.");
  const event = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!event || typeof event.id !== "string" || typeof event.htmlLink !== "string") {
    return safeError("Google Calendar returned an invalid event.");
  }
  return { id: event.id, htmlLink: event.htmlLink };
}

export async function storeGoogleConnection(input: {
  userId: string; workspaceId: string; accessToken: string; refreshToken: string | null; expiresIn: number; scope: string;
}) {
  const { error } = await adminDb.from("google_calendar_connections").upsert({
    user_id: input.userId,
    workspace_id: input.workspaceId,
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
    expires_at: new Date(Date.now() + input.expiresIn * 1000).toISOString(),
    scope: input.scope,
    revoked_at: null,
  }, { onConflict: "user_id,workspace_id" });
  if (error) throw new Error("Google Calendar connection could not be saved.");
}

export function googleAuthorizationUrl(state: string) {
  const { clientId, redirectUri } = config();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", access_type: "offline", prompt: "consent", scope: GOOGLE_CALENDAR_SCOPE, state }).toString();
  return url.toString();
}
