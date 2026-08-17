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