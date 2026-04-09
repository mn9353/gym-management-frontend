# Vercel Deployment - Quick Reference

## 🚀 In 5 Minutes

### Step 1: Push to GitHub (if not already done)
```bash
cd gym-management-frontend/gym-management-web
git add .
git commit -m "Configure for Vercel deployment"
git push origin main
```

### Step 2: Import in Vercel
1. Go to https://vercel.com/new
2. Select your `gym-management` repository
3. Click "Import"
4. ✅ Framework: Angular (auto-detected)
5. ✅ Build Command: `npm run build`
6. ✅ Output Directory: `dist/gym-management-web`
7. Click "Deploy" ← **First deploy happens here**

### Step 3: Set Environment Variable
1. After deployment completes, click "Project Settings"
2. Go to "Environment Variables"
3. Add:
   - **Name**: `API_URL`
   - **Value**: `https://gym-management-6rvq.onrender.com` (your Render backend URL)
4. Click "Save"

### Step 4: Redeploy
1. Go to "Deployments" tab
2. Click the "..." menu on your latest deployment
3. Click "Redeploy"
4. ✅ Done! Your app now has the correct API URL

---

## ✅ What Was Set Up

| File | Purpose |
|------|---------|
| `vercel.json` | Tells Vercel how to build & deploy |
| `src/environments/environment.ts` | Dev API URL: `http://localhost:5000` |
| `src/environments/environment.prod.ts` | Prod API URL: Reads from `API_URL` env var |
| `.env.example` | Template showing what env vars are needed |
| `.gitignore` | Prevents .env files from being committed |

---

## 🔗 Your URLs (Once Deployed)

**Frontend URL** (Vercel): 
```
https://gym-management-web.vercel.app
or your custom domain
```

**Backend URL** (Render):
```
https://gym-management-6rvq.onrender.com
```

**API Calls** (from Frontend):
```
Frontend → Vercel CDN
Vercel CDN → [Browser] → Backend API on Render
```

---

## 🧪 Test After Deployment

1. Open your Vercel URL in browser
2. Should see login page
3. Try logging in
4. Check DevTools → Network tab → should see API calls to your backend
5. ✅ If dashboard loads = Success!

---

## 🚨 If Something Goes Wrong

### "Cannot reach API"
```
Check:
1. API_URL environment variable is set in Vercel
2. Backend is running on Render
3. Backend CORS allows Vercel domain
```

### "Page is blank"
```
Check browser console for errors:
F12 → Console tab → Look for red errors
```

### "Routes give 404"
```
Already fixed! vercel.json handles SPA routing
Make sure vercel.json is in the root directory
```

### "Build fails"
```
Run locally first:
npm install
npm run build
Fix any errors, then push to GitHub
```

### "ng: command not found" (Build Error in Vercel)
```
This means Angular CLI wasn't installed before build.

Solution:
1. Ensure vercel.json has:
   "installCommand": "npm ci",
   "buildCommand": "npm ci && npm run build"

2. Ensure @angular/cli is in package.json devDependencies

3. Push changes to GitHub:
   git add .
   git commit -m "Fix Vercel build configuration"
   git push origin main

4. Go to Vercel Dashboard → Deployments → Redeploy latest
```

---

## 📌 Remember

- **Never commit** `.env` files (it's in .gitignore)
- **Always set** `API_URL` in Vercel dashboard, not in code
- **Always redeploy** after changing environment variables
- **Test locally** with `npm run build` before pushing

---

**You're all set for production!** 🎉

Just follow the 4 steps above and your Angular app will be live on Vercel!
