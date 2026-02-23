# Auto-Verify Email Testing Checklist

## Setup

1. **Local development** – Add to `.env.local`:
   ```
   VITE_AUTO_VERIFY_EMAIL=true
   ```

2. **Supabase (dev project)** – Turn off email confirmation:
   - Supabase Dashboard → Authentication → Providers → Email
   - Set **Confirm email** to OFF

3. Restart the dev server after env changes.

---

## Test 1: Auto-verify in dev

- [ ] Add `VITE_AUTO_VERIFY_EMAIL=true` to `.env.local`
- [ ] Ensure dev Supabase has "Confirm email" OFF
- [ ] Sign up a new user (Register page)
- [ ] User is redirected to dashboard without opening any verification email
- [ ] Yellow banner: "DEV: Auto-verify is ON..." is visible

---

## Test 2: Verification required when off

- [ ] Set `VITE_AUTO_VERIFY_EMAIL=false` (or remove it) in `.env.local`
- [ ] Turn ON "Confirm email" in Supabase (dev or prod project)
- [ ] Sign up a new user
- [ ] User receives verification email and must confirm before signing in
- [ ] Banner does not appear

---

## Production

- [ ] Ensure `VITE_AUTO_VERIFY_EMAIL` is `false` or not set in production env
- [ ] Supabase production project has "Confirm email" ON
- [ ] Do not deploy with auto-verify enabled
