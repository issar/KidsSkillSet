import { AUTO_VERIFY_EMAIL } from "../lib/autoVerify";

/**
 * Shows a prominent warning when auto-verify is enabled (dev/staging only).
 * NEVER deploy with VITE_AUTO_VERIFY_EMAIL=true in production.
 */
export default function AutoVerifyBanner() {
  if (!AUTO_VERIFY_EMAIL) return null;

  return (
    <div
      className="auto-verify-banner no-print"
      role="alert"
      style={{
        background: "#fef3cd",
        color: "#856404",
        padding: "0.5rem 1rem",
        textAlign: "center",
        fontSize: "0.9rem",
        fontWeight: 600,
        borderBottom: "1px solid #ffc107",
      }}
    >
      ⚠️ DEV: Auto-verify is ON. Ensure Supabase has &quot;Confirm email&quot; disabled.
      Never deploy with VITE_AUTO_VERIFY_EMAIL=true.
    </div>
  );
}
