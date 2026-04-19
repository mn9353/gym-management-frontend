# Gym Management Frontend

Angular frontend for the Gym Management system (admin + owner dashboards).

## Stack
- Angular 19
- RxJS
- Route guards + JWT interceptor
- Responsive UI (mobile + desktop)

## Repo Structure
- `gym-management-web/` - Angular app

## Quick Start
```bash
cd gym-management-web
npm install
npm start
```

App URL:
- `http://localhost:4200`

## API Base URL
Configured in:
- `gym-management-web/src/environments/environment.ts`
- `gym-management-web/src/environments/environment.development.ts`
- `gym-management-web/src/environments/environment.production.ts`

Current value points to deployed backend:
- `https://gym-management-1ekn.onrender.com`

## Security Notes
- No backend DB/JWT secrets are stored in frontend code.
- Do not commit `.env*` or local environment override files.
- Auth tokens are handled via the auth service + interceptor.

## Build
```bash
cd gym-management-web
npm run build
```

## Deploy (Vercel)
1. Import this GitHub repo in Vercel.
2. Set Root Directory to:
   - `gym-management-web`
3. Build command:
   - `npm run build`
4. Output directory:
   - `dist/gym-management-web`
5. Deploy.

## Current Features
- Role-based login and routing (`ADMIN`, `OWNER`, `STAFF`)
- Fixed top navigation shell with:
  - menu drawer
  - user profile menu
  - gym branding name/shortform
- Admin dashboard
- Owner dashboard
- Owner revenue page with selectable range (`3/6/12/24 months`)
- Owner members lists (active/expired)
- Owner team page (add staff + view users)

## Near-Term Next Steps
- Add member create/edit/renew screens
- Add revenue export (CSV)
- Add notifications panel for expiring memberships
