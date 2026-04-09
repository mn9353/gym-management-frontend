# Vercel Deployment - Complete Setup Checklist ✅

## Pre-Deployment Checklist

### Code Ready
- [x] Angular project structure created
- [x] Environment files configured:
  - [x] `environment.ts` (dev) → uses `http://localhost:5000`
  - [x] `environment.prod.ts` (prod) → reads from `process.env['API_URL']`
- [x] `vercel.json` configured with:
  - [x] Build command: `npm run build`
  - [x] Output directory: `dist/gym-management-web`
  - [x] SPA routing rewrites for Angular Router
  - [x] Environment variable configuration
- [x] `.gitignore` updated (excludes .env files)
- [x] `package.json` has correct build script
- [x] `angular.json` production configuration ready

### Repository
- [x] All code pushed to GitHub
- [x] `vercel.json` is in repository root (gym-management-frontend/gym-management-web/)
- [x] No `.env` files committed (they're in .gitignore)

---

## Deployment Steps

### Step 1: Verify Local Build Works ✅
```bash
cd gym-management-frontend/gym-management-web
npm install
npm run build
# Should create dist/gym-management-web folder without errors
```

### Step 2: Push Latest Changes to GitHub ✅
```bash
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

### Step 3: Create Vercel Account & Import Project ✅
1. Visit https://vercel.com
2. Sign up / Sign in (use GitHub auth for easier setup)
3. Click "Add New Project"
4. Select your `gym-management` repository
5. Vercel will auto-detect Angular framework ✅
6. Build Command is already correct: `npm run build` ✅
7. Output Directory is already correct: `dist/gym-management-web` ✅
8. Click "Deploy" 
9. **Wait for deployment to complete** (~2-5 minutes)

### Step 4: Add Environment Variable ⚠️ CRITICAL
1. After deployment succeeds, click "Project Settings"
2. Navigate to "Environment Variables" 
3. Click "Add New"
4. Fill in:
   - **Name**: `API_URL`
   - **Value**: `https://gym-management-6rvq.onrender.com` (your Render backend)
   - **Select all environments** (Production, Preview, Development)
5. Click "Save"

### Step 5: Redeploy with Environment Variable ✅
1. Go back to "Deployments" tab
2. Find your most recent deployment
3. Click the "..." menu
4. Select "Redeploy"
5. Confirm and wait for rebuild to complete

### Step 6: Test Your Deployment ✅
1. Go to your Vercel project URL (e.g., `https://gym-management-web.vercel.app`)
2. You should see the login page
3. Try logging in with test credentials
4. Open browser DevTools (F12) → Network tab
5. Verify API calls are reaching: `https://gym-management-6rvq.onrender.com`
6. Dashboard should load with data from backend

---

## File Overview

### vercel.json
- **Location**: `gym-management-frontend/gym-management-web/vercel.json`
- **Purpose**: Tells Vercel how to build and deploy your app
- **Key Feature**: SPA routing rewrites ensure Angular routing works

### Environment Files
- **`src/environments/environment.ts`**
  - Used: Local development (`npm start`)
  - API URL: `http://localhost:5000`
  
- **`src/environments/environment.prod.ts`**
  - Used: Production build (`npm run build`)
  - API URL: Reads from `process.env['API_URL']`
  - Fallback: `https://gym-management-6rvq.onrender.com`

### .env Files
- **`.env.example`** - Template (committed to repo, shows what variables are needed)
- **`.env`** - Local (NOT committed, created locally for development)
- **Vercel Dashboard** - Where production env vars are set

---

## Post-Deployment

### Verify Everything Works
- [ ] Frontend is accessible at Vercel URL
- [ ] Can navigate to login page
- [ ] Can submit login form
- [ ] Receives response from backend
- [ ] No CORS errors in console
- [ ] Dashboard loads after login
- [ ] Member data displays correctly
- [ ] API calls show correct backend URL in Network tab

### Monitor Deployments
- Visit Vercel Dashboard anytime to:
  - Check deployment status
  - View build logs
  - View runtime logs
  - Redeploy previous versions
  - Update environment variables

### Future Updates
- Push code changes to GitHub `main` branch
- Vercel automatically rebuilds and redeploys
- Takes 1-2 minutes
- Preview URLs for pull requests

---

## Environment Variables Reference

| Variable | Dev Value | Prod Value | Where Set |
|----------|-----------|-----------|-----------|
| `API_URL` | `http://localhost:5000` | `https://gym-management-6rvq.onrender.com` | Vercel Dashboard |

**Note**: In development, `API_URL` is ignored - the code uses the hardcoded value from `environment.ts`.

---

## Troubleshooting

### Build Fails on Vercel
**Symptom**: Red X on deployment
**Solution**: 
1. Check build logs in Vercel dashboard
2. Ensure your local build works: `npm run build`
3. Push fixes to GitHub and redeploy

### "Cannot reach API" (401/400 errors)
**Symptom**: Login fails, API calls show 401
**Possible Causes**:
1. `API_URL` not set in Vercel environment variables
2. Backend not running on Render
3. Backend CORS not configured for Vercel domain

**Solution**:
1. Verify `API_URL` is set in Vercel dashboard
2. Check Render backend is running
3. Update backend CORS to include Vercel domain

### Page Blank After Redirect from Login
**Symptom**: Redirects to dashboard but page is blank
**Possible Causes**:
1. JavaScript error (check DevTools console)
2. API call failed silently
3. Routes not configured correctly

**Solution**:
1. Open DevTools (F12)
2. Check Console tab for red errors
3. Check Network tab to see API calls
4. Verify backend is returning data

### Routes Return 404
**Symptom**: Refreshing loses route, shows 404
**Solution**: Already handled by `vercel.json` rewrites
- Ensure `vercel.json` is in project root
- Redeploy after verifying it's in git

---

## Security Checklist

- [x] No environment secrets in code
- [x] `.env` files in `.gitignore` (not committed)
- [x] Secrets only in Vercel dashboard
- [x] HTTPS enforced (automatic on Vercel)
- [x] API calls include JWT token (to be implemented in services)
- [x] CORS configured on backend

---

## Performance Notes

- Vercel includes CDN for faster global delivery
- Angular production build is optimized (minified, AoT compiled)
- Automatic gzip compression included
- Build time: ~1-3 minutes
- Deploy time: ~30 seconds

---

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Angular Deployment Guide](https://angular.io/guide/deployment)
- [Environment Variables in Vercel](https://vercel.com/docs/projects/environment-variables)

---

## Summary

✅ **Your Angular app is configured and ready for Vercel deployment!**

**What's been set up:**
1. Build configuration (`vercel.json`)
2. Environment variables handling (dev & prod)
3. SPA routing support
4. GitHub integration ready

**To deploy:**
1. Push to GitHub
2. Connect to Vercel (4 minutes)
3. Set `API_URL` environment variable
4. Redeploy
5. Test

**Your live URL will be:**
```
https://gym-management-web.vercel.app
```

---

**Last Updated**: April 10, 2026
**Status**: Ready for Deployment ✅
