# Security Checklist (Frontend)

## Do Not Commit
- `.env` files
- local environment overrides (`environment.local*.ts`)
- tokens/session dumps

## Authentication
- Keep `Authorization: Bearer <token>` attached via interceptor only.
- On refresh failure, force logout and redirect to login.

## Deployment Hygiene
- Use HTTPS frontend + HTTPS backend endpoint.
- Keep backend CORS restricted to your Vercel domain.

## Operational
- Rotate compromised admin credentials immediately.
- Remove test/demo users before production pitching.
