'use strict';
// Public Supabase project configuration. Publishable keys are designed for clients;
// never put a secret or service-role key here. Override via environment if needed.
module.exports = {
  url: process.env.SUPABASE_URL || "https://fynlvbtefmawisauzitu.supabase.co",
  anonKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_HRiF5925V8pU0Jr8TTyv3w_SWTjNo4e"
};
