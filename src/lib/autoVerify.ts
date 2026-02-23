/**
 * VITE_AUTO_VERIFY_EMAIL: When true, the app assumes new signups are auto-verified
 * (e.g. dev Supabase project has "Confirm email" disabled).
 *
 * SECURITY: Set to "false" (or omit) in production. Never deploy with this true.
 * This flag controls the dev warning banner only. Actual verification bypass
 * is done via Supabase project config (Authentication → Email → Confirm email = OFF).
 */
export const AUTO_VERIFY_EMAIL = import.meta.env.VITE_AUTO_VERIFY_EMAIL === "true";
