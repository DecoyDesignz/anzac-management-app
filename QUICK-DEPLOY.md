# Quick Production Deployment Guide

Follow these steps in order to deploy your ANZAC Management System to production.

## Prerequisites Checklist

- [ ] Git repository is up to date
- [ ] All local changes committed
- [ ] Node.js 20+ installed
- [ ] Have a Vercel account
- [ ] Have a Convex account

## Step-by-Step Deployment

### 1. Deploy Convex Backend to Production

```bash
# Run this command and follow the prompts
npm run convex:deploy
```

**What happens:**
- Creates a new production Convex deployment (separate from dev)
- Pushes your database schema
- Deploys all backend functions
- Runs `npm run build` to verify Next.js builds successfully

**Save this URL:** At the end, you'll see:
```
✔ Deployment complete!
Your production deployment URL: https://[your-prod-slug].convex.cloud
```

**Copy this URL - you'll need it in step 3!**

---

### 2. Generate NextAuth Secret

Run this command to generate a secure secret:

**Linux/Mac:**
```bash
openssl rand -base64 32
```

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Copy the output** - you'll need it in step 3!

Example output:
```
+aff5GqMcrVj7wTkgMDr+BYM73eluOIfazWm43Mr+wE=
```

---

### 3. Deploy to Vercel

#### Option A: Vercel CLI (Faster)

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

When prompted, follow the wizard:
- **Set up and deploy?** Yes
- **Which scope?** Select your account
- **Link to existing project?** No (unless you already created one)
- **Project name?** anzac-management (or your choice)
- **Directory?** Press Enter (use current)
- **Override settings?** No

After deployment completes, add environment variables:

```bash
# Add NEXTAUTH_SECRET
vercel env add NEXTAUTH_SECRET production
# Paste the secret from Step 2 when prompted

# Add Convex URL
vercel env add NEXT_PUBLIC_CONVEX_URL production
# Paste the URL from Step 1 when prompted
```

Then redeploy to apply the environment variables:

```bash
vercel --prod
```

#### Option B: Vercel Dashboard (More Visual)

1. Go to https://vercel.com/new

2. **Import Git Repository**
   - Click "Import" next to your repo
   - Or paste the Git URL

3. **Configure Project:**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: **./** (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

4. **Environment Variables:**
   Click "Environment Variables" and add:

   | Name | Value | Environments |
   |------|-------|--------------|
   | `NEXTAUTH_SECRET` | Paste from Step 2 | Production |
   | `NEXT_PUBLIC_CONVEX_URL` | Paste from Step 1 | Production |

5. Click **"Deploy"**

6. Wait for deployment to complete (~2-3 minutes)

---

### 4. Create Initial Admin User

After Vercel deployment succeeds:

```bash
# Generate admin credentials
npm run create-admin
```

The script will output something like:

```
✅ ADMIN CREDENTIALS GENERATED

Username: admin
Email: admin@anzac.mil
Password: [randomly generated]
Password Hash: $2a$10$xxxxxxxxxxxxxxxxxxxxx...

MANUAL SETUP REQUIRED:
1. Go to: https://dashboard.convex.dev
2. Select your PRODUCTION deployment
3. Click "Data" → "systemUsers"
4. Create new document with above values
```

**Important:** Follow the manual instructions to create the admin user in your **production** Convex deployment, not dev!

**Save the credentials** in a secure password manager!

---

### 5. Test Your Deployment

1. **Get your Vercel URL** (from deployment output or dashboard)
   - Example: `https://anzac-management.vercel.app`

2. **Visit your site:**
   - Navigate to the URL
   - You should see the login page

3. **Test login:**
   - Username: `admin` (or what you set)
   - Password: From Step 4
   - Click "Sign In"

4. **Verify security headers:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Reload the page
   - Click any request
   - Check "Response Headers" for:
     - `X-Frame-Options: DENY` ✅
     - `Content-Security-Policy: ...` ✅
     - `Strict-Transport-Security: ...` ✅

5. **Test functionality:**
   - Navigate through the dashboard
   - Try creating a test personnel record
   - Check the calendar
   - Verify qualifications page loads

**If everything works - congratulations, you're deployed! 🎉**

---

## Troubleshooting

### Convex Deployment Fails

**Error:** "No CONVEX_DEPLOYMENT set"

**Fix:**
```bash
# Initialize Convex first
npx convex dev
# Then try deploy again
npm run convex:deploy
```

---

### Vercel Build Fails

**Error:** Build errors in logs

**Fix:**
```bash
# Test build locally first
npm run build

# If it works locally, check Vercel environment variables
# Make sure NEXT_PUBLIC_CONVEX_URL is set correctly
```

---

### Can't Login After Deployment

**Possible causes:**
1. Admin user not created in **production** Convex (check correct deployment)
2. Wrong password or username
3. Environment variables not set correctly

**Fix:**
1. Verify in Convex dashboard (production deployment):
   - Data → systemUsers → admin user exists
2. Try running `npm run create-admin` again with a new password
3. Check Vercel environment variables are set

---

### Security Headers Not Present

**Check:**
```bash
# Test headers
curl -I https://your-app.vercel.app

# Should see:
# X-Frame-Options: DENY
# Content-Security-Policy: ...
```

**If missing:** Redeploy Vercel (the config might not have been picked up)

---

## Post-Deployment Checklist

- [ ] Can access the site via Vercel URL
- [ ] Login works with admin credentials
- [ ] Dashboard loads correctly
- [ ] Security headers are present
- [ ] All pages are accessible
- [ ] Admin password saved securely
- [ ] Convex production URL documented
- [ ] Vercel URL documented
- [ ] Team members informed of new URL

---

## What's Next?

1. **Set up custom domain** (optional)
   - In Vercel dashboard: Settings → Domains
   - Add your domain and configure DNS

2. **Configure CORS** (if needed for external integrations)

3. **Set up monitoring**
   - Vercel Analytics (built-in)
   - Convex dashboard for backend monitoring

4. **Create additional admin users**
   - Log in as super admin
   - Navigate to Settings → Users
   - Create additional accounts

5. **Import data** (if migrating from existing system)

6. **Train your team** on the system

---

## Getting Help

- **Detailed deployment guide:** See `DEPLOYMENT.md`
- **Admin scripts help:** See `scripts/README.md`
- **Vercel docs:** https://vercel.com/docs
- **Convex docs:** https://docs.convex.dev

---

**Estimated time:** 15-20 minutes for first deployment
**Estimated cost:** $0 (free tiers)

