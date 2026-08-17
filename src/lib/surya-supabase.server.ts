// Server-only Supabase client for the customer-owned "SuryaCine" project.
// Replaces the Lovable Cloud managed database/storage.
// Credentials live in encrypted secrets: SURYA_SUPABASE_URL / SURYA_SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "@supabase/supabase-js";

function build() {
  const url = process.env["SURYA_SUPABASE_URL"];
  const key = process.env["SURYA_SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    throw new Error(
      "Missing SURYA_SUPABASE_URL or SURYA_SUPABASE_SERVICE_ROLE_KEY environment variable.",
    );
  }
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

let _client: ReturnType<typeof build> | undefined;

/** Service-role client (bypasses RLS). Server-side use only. */
export const suryaDb = new Proxy({} as ReturnType<typeof build>, {
  get(_, prop, receiver) {
    if (!_client) _client = build();
    return Reflect.get(_client, prop, receiver);
  },
});

/**
 * Publishable-key client used ONLY to verify client credentials
 * (`signInWithPassword`). Never persists a session — the app keeps its own
 * signed, httpOnly cookie session instead.
 */
function buildAuth() {
  const url = process.env["SURYA_SUPABASE_URL"];
  const key = process.env["SURYA_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new Error("Missing SURYA_SUPABASE_URL or SURYA_SUPABASE_PUBLISHABLE_KEY.");
  }
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        // sb_publishable_ keys are opaque strings, not bearer JWTs.
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

let _authClient: ReturnType<typeof buildAuth> | undefined;

export const suryaAuth = new Proxy({} as ReturnType<typeof buildAuth>, {
  get(_, prop, receiver) {
    if (!_authClient) _authClient = buildAuth();
    return Reflect.get(_authClient, prop, receiver);
  },
});