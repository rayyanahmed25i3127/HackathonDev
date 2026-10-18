
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !publishableKey || !secretKey) {
  throw new Error("Missing Supabase environment variables");
}

export const adminDb = createClient(url, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const authClient = createClient(url, publishableKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function requireUser(req: NextRequest) {
  const authorization = req.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authorization.slice(7);

  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("UNAUTHORIZED");
  }

  const { data: profile, error: profileError } = await adminDb
    .from("profiles")
    .select("id, workspace_id, role, full_name, availability")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  return { user: data.user, profile };
}
