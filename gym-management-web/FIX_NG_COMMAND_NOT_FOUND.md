# Fix for "ng: command not found" Error in Vercel

## ❌ The Problem
```
sh: line 1: ng: command not found
Error: Command "ng build" exited with 127
```

This error means Vercel couldn't find the Angular CLI (`ng` command) during the build process.

## ✅ The Solution

The issue has been fixed in your `vercel.json`. Here's what was changed:

### Before (❌ Incorrect)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/gym-management-web"
}
```

### After (✅ Fixed)
```json
{
  "buildCommand": "npm ci && npm run build",
  "installCommand": "npm ci",
  "outputDirectory": "dist/gym-management-web"
}
```

### What Changed
1. **`installCommand`**: Explicitly tells Vercel to run `npm ci` (clean install) before building
2. **`buildCommand`**: Now runs `npm ci && npm run build` to ensure dependencies are installed

## 🚀 How to Apply the Fix

### Step 1: Verify files are updated locally
The following files have been updated:
- ✅ `vercel.json` - Updated with explicit install command
- ✅ `VERCEL_QUICK_REFERENCE.md` - Updated with troubleshooting info

### Step 2: Push to GitHub
```bash
cd gym-management-frontend/gym-management-web
git add vercel.json VERCEL_QUICK_REFERENCE.md
git commit -m "Fix: Add explicit npm ci install command to Vercel config"
git push origin main
```

### Step 3: Redeploy on Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `gym-management-web` project
3. Go to "Deployments" tab
4. Click "..." menu on your latest failed deployment
5. Select "Redeploy"
6. Wait for build to complete (should succeed now)

## ✨ Why This Works

When you push code to Vercel:
1. Vercel runs: `npm ci` (installs dependencies, including @angular/cli)
2. Dependencies are installed to `node_modules`
3. Vercel runs: `npm run build`
4. npm finds `ng` command in `node_modules/.bin/ng`
5. Build succeeds! ✅

## 🔍 Verification

After redeploy, you should see:
- ✅ Build status: "Ready"
- ✅ No "ng: command not found" error
- ✅ Build takes ~2-3 minutes

Then check that:
1. Your Vercel URL works
2. Login page loads
3. API calls reach your backend

## 📝 Important Notes

- **`npm ci`** = Clean Install (better for CI/CD than `npm install`)
- **`@angular/cli`** = Must be in `package.json` devDependencies (✅ It is)
- **Build Command** = Must come after install (✅ Fixed)

## 🆘 If It Still Fails

Check Vercel build logs:
1. Deployments tab
2. Click on failed deployment
3. Scroll to see full error message
4. Look for:
   - Is `npm ci` running?
   - Is `node_modules` being created?
   - Is `@angular/cli` being installed?

If different error appears, check error message and troubleshoot accordingly.

---

**Status**: ✅ Fix Applied  
**Next Action**: Push to GitHub and redeploy on Vercel
