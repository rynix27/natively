import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

const supabaseUrl = "https://itfbkeqkuuvypgwjauoc.supabase.co";
const supabasePublishableKey =
  "sb_publishable_xNCRFfLwDlUGel9CPsmcnw_vl9fS4YF";

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    flowType: "implicit",
    detectSessionInUrl: true,
  },
});
