# Vercel Deployment Guide - Gym Management Frontend

## ✅ Checklist Before Deploying

### Files Created/Updated:
- ✅ `vercel.json` - Build configuration for Vercel
- ✅ `src/environments/environment.ts` - Development API URL
- ✅ `src/environments/environment.prod.ts` - Production API URL (reads from env var)
- ✅ `.env.example` - Example environment file
- ✅ `.gitignore` - Updated to exclude .env files
- ✅ `package.json` - Already has build script

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository

1. **Make sure you're in the frontend project root:**
   ```bash
   cd gym-management-frontend/gym-management-web
   ```

2. **Install dependencies locally:**
   ```bash
   npm install
   ```

3. **Test the build locally:**
   ```bash
   npm run build
   ```
   
   This should create a `dist/gym-management-web` folder without errors.

4. **Commit and push to GitHub:**
   ```bash
   git add .
   git commit -m "Add Vercel configuration and environment files"
   git push origin main
   ```

### Step 2: Connect to Vercel

1. **Go to [Vercel.com](https://vercel.com)**
   
2. **Sign in or create an account** (you can use GitHub login)

3. **Click "Add New Project"**

4. **Import your GitHub repository:**
   - Select your `gym-management` repository
   - Keep default settings
   - Click "Import"

### Step 3: Configure Build Settings

When Vercel asks for build settings:

- **Framework Preset**: Automatically detects "Angular" (or select it)
- **Build Command**: `npm run build` (already set)
- **Output Directory**: `dist/gym-management-web` (already correct in vercel.json)
- **Install Command**: `npm install` (default)

**Then click "Deploy"** - This will deploy with default settings.

### Step 4: Add Environment Variables (IMPORTANT!)

1. **After deployment, go to Project Settings**
2. **Navigate to "Environment Variables"**
3. **Add the following environment variable:**

   | Name | Value | Type |
   |------|-------|------|
   | `API_URL` | `https://gym-management-6rvq.onrender.com` | Plain Text |

   *(Replace with your actual backend URL from Render)*

4. **Re-deploy** to apply the environment variable:
   - Go to "Deployments"
   - Click on the latest deployment
   - Click "Redeploy"

### Step 5: Verify Deployment

1. **Check the deployment URL** - Vercel will provide you with a URL like:
   ```
   https://gym-management-web.vercel.app
   ```

2. **Test the deployment:**
   - Open the URL in your browser
   - Try logging in
   - Ensure the API calls reach your backend

3. **If you get CORS errors:**
   - Check your backend CORS configuration
   - Make sure Vercel domain is allowed in backend's CORS policy

## 🔧 Environment Variables Reference

### Development (local)
- File: `src/environments/environment.ts`
- API URL: `http://localhost:5000` (local backend)
- Used when running: `npm start`

### Production (Vercel)
- File: `src/environments/environment.prod.ts`
- Reads from: `process.env['API_URL']`
- Set in Vercel's "Environment Variables" section
- Used when: `npm run build` (which Vercel runs automatically)

### Fallback
- If `API_URL` env var is not set, defaults to: `https://gym-management-6rvq.onrender.com`

## 📝 vercel.json Explained

```json
{
  "buildCommand": "npm run build",        // Command to build the app
  "outputDirectory": "dist/gym-management-web",  // Where build outputs go
  "env": {
    "API_URL": "@gym_api_url"    // Reference to environment variable
  },
  "rewrites": [                   // Important for SPA routing!
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Key Point**: The `rewrites` section is crucial! It tells Vercel to serve `index.html` for all routes, allowing Angular routing to work properly.

## 🌐 Custom Domain (Optional)

To use your own domain instead of `vercel.app`:

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS settings as instructed by Vercel
4. Update `API_URL` environment variable if using same domain structure

## 🔐 Security Checklist

- ✅ `.env` files are in `.gitignore` (secrets not committed)
- ✅ Environment variables set in Vercel dashboard (not in code)
- ✅ API calls use HTTPS
- ✅ Backend API has proper CORS configuration
- ✅ JWT token stored securely (check Angular services)

## 🐛 Troubleshooting

### Build Fails with "Cannot find module"
```bash
# Solution: Make sure all dependencies are installed
npm install
npm run build
```

### "Cannot GET /" after deployment
```
Solution: vercel.json rewrites section handles this
Make sure it's correctly configured
```

### API Calls Return 401/CORS Errors
```
Possible causes:
1. API_URL environment variable not set or wrong
2. Backend CORS not configured for Vercel domain
3. JWT token expired or not sent in headers

Solution:
- Check Vercel environment variables
- Verify backend CORS policy includes Vercel domain
- Check browser console for exact error
```

### Assets (images, CSS) Not Loading
```
Solution: Check that asset paths are correct in components
Use relative paths: ./assets/image.png
Or absolute paths from src: /assets/image.png
```

## 📊 Monitoring Deployments

### View Deployment Status
1. Go to Vercel Dashboard
2. Select your project
3. Go to "Deployments" tab
4. Click on any deployment to see logs

### View Build Logs
1. Click on a deployment
2. Click "Build Logs" tab
3. Look for errors

### View Runtime Logs
1. Click on a deployment
2. Click "Runtime Logs" tab
3. See HTTP requests and errors

## 🔄 Automatic Deployments

Once connected to GitHub:
- **Every push to `main` branch** = Automatic deployment
- **Pull requests** = Preview deployments (see changes before merging)
- **Rollback anytime** = Go to Deployments and redeploy any previous version

## 📈 Performance Tips

1. **Enable gzip compression** (automatic on Vercel)
2. **Use Angular's production build optimization** (automatic with `npm run build`)
3. **Minimize bundle size:**
   ```bash
   npm run build -- --stats-json
   ng build --configuration production --stats-json
   ```

4. **Lazy load routes in Angular** (implement when building features)

## 🚨 Important Notes

### API_URL Environment Variable
- **Must** be set in Vercel dashboard, not in code
- Change it if you deploy backend to different URL later
- Each environment (staging, production) can have different values

### Build Output
- Build creates: `dist/gym-management-web/`
- Vercel serves from this directory
- All files are static (HTML, JS, CSS)

### Rebuilds
- If you change environment variables, you must redeploy (rebuild)
- Simply pushing code to GitHub triggers automatic rebuild
- You can force a rebuild in Vercel dashboard

## ✨ Post-Deployment Checklist

- [ ] Frontend is accessible at `vercel.app` URL or custom domain
- [ ] Can navigate to login page
- [ ] Can submit login form
- [ ] Receives response from backend API (check Network tab in DevTools)
- [ ] No CORS errors in browser console
- [ ] No 404 errors on page navigation
- [ ] Environment variables are correctly set
- [ ] Dashboard loads properly after login

## 📞 Need Help?

### Common Issues & Solutions

**Issue: "API is unreachable"**
- Check `API_URL` in Vercel environment variables
- Verify backend is running on Render
- Check CORS configuration on backend

**Issue: "Routes not working (404 on refresh)"**
- ✅ Already fixed by rewrites in vercel.json
- Make sure vercel.json is in frontend root

**Issue: "Build succeeds but site is blank"**
- Check browser console for JavaScript errors
- Check Network tab to see if API calls fail
- Run locally first: `npm run build && npm run serve`

---

**Your Vercel Frontend is now ready to deploy!** 🚀

Next: Deploy your backend to Render (if not already done), set the `API_URL` environment variable, and test the complete flow!
