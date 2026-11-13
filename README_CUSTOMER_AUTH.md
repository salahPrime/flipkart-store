# Customer authentication setup

The storefront now uses Better Auth with Neon PostgreSQL. Customer registration, email verification, email/password sign-in, server-side sessions, sign-out, and password-reset email delivery are handled by the server. Passwords are hashed by Better Auth and are never stored in browser storage.

## Required services

- A Neon PostgreSQL database
- A Resend account with a verified sender domain
- A Vercel project connected to this repository

## 1. Create the database schema

1. Open the Neon project and its SQL Editor.
2. Run the complete contents of `db/customer-auth.sql` once.
3. Copy the pooled connection string from Neon. Use the pooled hostname and keep `sslmode=require`.

## 2. Configure Vercel environment variables

Add these variables for Production, Preview, and Development as appropriate:

- `DATABASE_URL`: Neon pooled PostgreSQL connection string
- `BETTER_AUTH_SECRET`: a unique random secret (at least 32 bytes)
- `BETTER_AUTH_URL`: the canonical URL for this deployment
- `APP_URL`: the same canonical origin used by the customer-facing site
- `RESEND_API_KEY`: Resend API key
- `EMAIL_FROM`: sender address on a domain verified in Resend

Use the production domain for Production and the matching deployment origin for Preview. Never commit real values to GitHub or place them in browser JavaScript. Redeploy after adding or changing environment variables.

## 3. Email provider

Verify the sender domain in Resend and configure its DNS records before testing registration or password reset. Verification and reset links are sent by the server. Better Auth logs failures from the email callback; if a verification message does not arrive, try signing in again to trigger a fresh verification email and inspect Vercel function logs.

## 4. Test before launch

- Register with an email inbox you control and a password of at least 10 characters.
- Confirm the verification email arrives and its link activates the account.
- Sign in with the verified account, refresh the page, and confirm the session remains active.
- Sign out and confirm the session is cleared.
- Request a password reset and test the emailed link.
- Try duplicate registration, an invalid email, a short password, and an unverified sign-in.
- Review Vercel function logs and Neon logs for errors.

## Important scope

This change secures customer authentication only. It does not convert the existing browser-local cart, demo checkout, or static admin dashboard into production order management. Do not accept real payments or real customer delivery details until those separate systems have secure server-side storage and authorization. The admin dashboard must also be protected independently before it is used with live business data.
