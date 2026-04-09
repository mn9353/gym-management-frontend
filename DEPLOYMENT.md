# Deployment Guide (Frontend)

## Vercel Settings
- Framework Preset: `Angular`
- Root Directory: `gym-management-web`
- Build Command: `npm run build`
- Output Directory: `dist/gym-management-web`

## Pre-Deploy Check
```bash
cd gym-management-web
npm install
npm run build
```

## Domain / CORS Reminder
After Vercel deploy, add the frontend domain to backend CORS in Render:
- `Cors__AllowedOrigins__0=https://<your-vercel-domain>`

## Troubleshooting
- If routes 404 on refresh, ensure deployment is from Angular build output and not static source.
- If API calls fail with 401/403, verify JWT login and backend CORS settings.
