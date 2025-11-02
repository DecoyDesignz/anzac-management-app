# Migration Guide

Complete guide for migrating the ANZAC Management System application, database, and deployment to new accounts.

## Table of Contents

1. [Overview & Prerequisites](#overview--prerequisites)
2. [Pre-Migration Preparation](#pre-migration-preparation)
3. [Convex Database Migration](#convex-database-migration)
4. [Vercel Deployment Migration](#vercel-deployment-migration)
5. [Application Configuration](#application-configuration)
6. [Post-Migration Verification](#post-migration-verification)
7. [Troubleshooting](#troubleshooting)

---

## Overview & Prerequisites

This guide covers migrating the ANZAC Management System from one set of accounts to another. The migration involves:

- **Convex Database**: Moving the database and backend functions to a new Convex account/project
- **Vercel Deployment**: Moving the Next.js application deployment to a new Vercel account/project
- **Application Configuration**: Updating environment variables and connection strings

### Required Accounts

Before starting, ensure you have:

- [ ] Access to the **source** Convex account and project
- [ ] Access to the **target** Convex account (or ability to create one)
- [ ] Access to the **source** Vercel account and project
- [ ] Access to the **target** Vercel account (or ability to create one)
- [ ] Access to the Git repository
- [ ] Convex CLI installed (`npm install -g convex`)
- [ ] Vercel CLI installed (`npm install -g vercel`)

### Prerequisites Checklist

- [ ] Convex CLI installed and authenticated (`convex login`)
- [ ] Vercel CLI installed and authenticated (`vercel login`)
- [ ] Node.js and npm installed
- [ ] Git repository cloned locally
- [ ] All source account credentials documented
- [ ] Backup of current production data (recommended)

### Estimated Time

- **Pre-migration preparation**: 30 minutes
- **Convex migration**: 1-2 hours (depending on data size)
- **Vercel migration**: 30-45 minutes
- **Configuration and verification**: 30-45 minutes
- **Total**: 2.5-4 hours

### Downtime Considerations

- **Minimum downtime**: Plan for 30-60 minutes of downtime during the final switchover
- **Zero-downtime option**: Can be achieved by running both systems in parallel and switching DNS/environment variables

---

## Pre-Migration Preparation

### 1. Environment Variables Inventory

Document all current environment variables. The application requires:

#### Required Environment Variables

```
NEXT_PUBLIC_CONVEX_URL=<your-convex-deployment-url>
NEXTAUTH_SECRET=<your-nextauth-secret>
```

#### How to Export Current Environment Variables

**From Vercel Dashboard:**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Copy all variables to a secure document

**From Convex Dashboard:**
1. Go to your project settings
2. Navigate to "Environment Variables" (if any are set)
3. Document any custom configuration

### 2. Data Backup Procedures

**Automatic Backup (Recommended):**
Convex automatically backs up your data. However, you can export manually:

```bash
# Export all data from Convex
npx convex data export --output ./backup-$(date +%Y%m%d).json
```

**Manual Backup via Dashboard:**
1. Go to https://dashboard.convex.dev
2. Select your project
3. Navigate to "Data"
4. Manually document critical records or use the export function if available

### 3. Code Repository Access

Ensure you have:
- [ ] Local repository cloned and up to date
- [ ] Push access to the repository
- [ ] Branch protection rules documented (if any)
- [ ] All recent commits are pushed

```bash
# Verify repository status
git status
git pull origin main
```

### 4. Document Current Setup

Create a migration checklist document with:

- Current Convex project URL
- Current Vercel project URL
- Current environment variable values
- Current custom domain (if any)
- Current user accounts and roles
- Any custom configurations

---

## Convex Database Migration

### Step 1: Create New Convex Project

#### Option A: Via Convex Dashboard

1. Log in to Convex with your **target** account: https://dashboard.convex.dev
2. Click "New Project"
3. Enter project name (e.g., "anzac-management-production")
4. Select region (choose the same or closest to your users)
5. Click "Create Project"
6. Note the new deployment URL (e.g., `https://example-123.convex.cloud`)

#### Option B: Via Convex CLI

```bash
# Log in to target account
convex login

# Create new project
npx convex dev --once --configure new-project

# Follow prompts to create project
# Note the deployment URL provided
```

### Step 2: Clone and Configure Local Repository

```bash
# Navigate to your project directory
cd anzac-management-app

# If not already connected, link to new Convex project
npx convex dev --once --configure new-project

# This will update .env.local with the new NEXT_PUBLIC_CONVEX_URL
```

### Step 3: Deploy Schema to New Project

```bash
# Deploy schema and functions to new project
npx convex deploy

# Verify deployment
npx convex run systemSettings:getSettings
```

### Step 4: Export Data from Source Project

#### Option A: Using Convex Data Export (if available)

```bash
# Switch to source project temporarily
# Update .env.local with source project URL
# Then export:
npx convex data export --output ./source-data-export.json
```

#### Option B: Manual Export via Dashboard

1. Log in to **source** Convex dashboard
2. Navigate to each table in "Data" section
3. Export or copy critical data:
   - `personnel` - All personnel records
   - `ranks` - Rank definitions
   - `schools` - Training schools
   - `qualifications` - Qualification definitions
   - `personnelQualifications` - Personnel qualifications
   - `rankHistory` - Promotion history
   - `events` - Calendar events
   - `eventParticipants` - Event enrollments
   - `userRoles` - User role assignments
   - `instructorSchools` - Instructor assignments
   - `eventInstructors` - Event instructor assignments
   - `eventTypes` - Event type definitions
   - `servers` - Server definitions
   - `systemSettings` - System settings
   - `roles` - Role definitions

#### Option C: Using Convex Functions (Recommended for Large Datasets)

Create a temporary export function in your source project:

```typescript
// In convex/dataExport.ts (temporary file)
import { query } from "./_generated/server";
import { api } from "./_generated/api";

export const exportAllData = query(async (ctx) => {
  const personnel = await ctx.db.query("personnel").collect();
  const ranks = await ctx.db.query("ranks").collect();
  const schools = await ctx.db.query("schools").collect();
  const qualifications = await ctx.db.query("qualifications").collect();
  const personnelQualifications = await ctx.db.query("personnelQualifications").collect();
  const rankHistory = await ctx.db.query("rankHistory").collect();
  const events = await ctx.db.query("events").collect();
  const eventParticipants = await ctx.db.query("eventParticipants").collect();
  const userRoles = await ctx.db.query("userRoles").collect();
  const instructorSchools = await ctx.db.query("instructorSchools").collect();
  const eventInstructors = await ctx.db.query("eventInstructors").collect();
  const eventTypes = await ctx.db.query("eventTypes").collect();
  const servers = await ctx.db.query("servers").collect();
  const systemSettings = await ctx.db.query("systemSettings").collect();
  const roles = await ctx.db.query("roles").collect();

  return {
    personnel,
    ranks,
    schools,
    qualifications,
    personnelQualifications,
    rankHistory,
    events,
    eventParticipants,
    userRoles,
    instructorSchools,
    eventInstructors,
    eventTypes,
    servers,
    systemSettings,
    roles,
  };
});
```

Then export:

```bash
# Switch to source project
# Update .env.local with source NEXT_PUBLIC_CONVEX_URL

# Run export
npx convex run dataExport:exportAllData > source-data.json

# Verify export file was created
ls -lh source-data.json
```

### Step 5: Import Data to Target Project

#### Option A: Manual Import via Dashboard

1. Log in to **target** Convex dashboard
2. Navigate to "Data" section
3. For each table:
   - Click "Add Document" or "Import" (if available)
   - Paste or upload exported data
   - Verify data integrity

#### Option B: Using Import Functions (Recommended)

Create import functions in your target project:

```typescript
// In convex/dataImport.ts (temporary file)
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const importAllData = mutation({
  args: {
    data: v.any(), // The exported data object
  },
  handler: async (ctx, args) => {
    const { data } = args;
    const results: Record<string, string[]> = {};

    // Import ranks first (they're referenced by personnel)
    if (data.ranks) {
      const rankIdMap: Record<string, string> = {};
      for (const rank of data.ranks) {
        const newId = await ctx.db.insert("ranks", rank);
        rankIdMap[rank._id] = newId;
      }
      results.ranks = Object.values(rankIdMap);
    }

    // Import schools next (referenced by qualifications)
    if (data.schools) {
      const schoolIdMap: Record<string, string> = {};
      for (const school of data.schools) {
        const newId = await ctx.db.insert("schools", school);
        schoolIdMap[school._id] = newId;
      }
      results.schools = Object.values(schoolIdMap);
    }

    // Import qualifications (reference schools)
    if (data.qualifications) {
      const qualIdMap: Record<string, string> = {};
      for (const qual of data.qualifications) {
        const newQual = {
          ...qual,
          schoolId: schoolIdMap[qual.schoolId] || qual.schoolId,
        };
        const newId = await ctx.db.insert("qualifications", newQual);
        qualIdMap[qual._id] = newId;
      }
      results.qualifications = Object.values(qualIdMap);
    }

    // Import personnel (reference ranks)
    if (data.personnel) {
      const personnelIdMap: Record<string, string> = {};
      for (const person of data.personnel) {
        const newPerson = {
          ...person,
          rankId: person.rankId ? (rankIdMap[person.rankId] || person.rankId) : undefined,
        };
        // Remove _id and _creationTime before insert
        const { _id, _creationTime, ...personData } = newPerson;
        const newId = await ctx.db.insert("personnel", personData);
        personnelIdMap[person._id] = newId;
      }
      results.personnel = Object.values(personnelIdMap);
    }

    // Import remaining tables with ID mapping...
    // (Similar pattern for other tables)

    return {
      success: true,
      imported: results,
    };
  },
});
```

**Important Notes for Data Import:**

1. **ID Mapping**: Convex generates new IDs, so you must map old IDs to new ones
2. **Foreign Keys**: Update all foreign key references after importing
3. **Import Order**: Import in dependency order:
   - `ranks` → `schools` → `qualifications` → `personnel` → other tables
4. **Personnel IDs**: Critical for `userRoles`, `instructorSchools`, `eventInstructors`, etc.

#### Option C: Using Convex Dashboard Bulk Import

If your data export is in a supported format:
1. Go to target Convex dashboard
2. Navigate to each table
3. Use "Import" feature if available
4. Map old IDs to new IDs manually or via scripts

### Step 6: Update References and Foreign Keys

After importing, you may need to update foreign key references:

```typescript
// Example: Update personnelQualifications with new personnel IDs
export const updatePersonnelReferences = mutation({
  args: { personnelIdMap: v.any() },
  handler: async (ctx, args) => {
    const allQualifications = await ctx.db.query("personnelQualifications").collect();
    
    for (const qual of allQualifications) {
      if (qual.personnelId && args.personnelIdMap[qual.personnelId]) {
        await ctx.db.patch(qual._id, {
          personnelId: args.personnelIdMap[qual.personnelId],
        });
      }
      if (qual.awardedBy && args.personnelIdMap[qual.awardedBy]) {
        await ctx.db.patch(qual._id, {
          awardedBy: args.personnelIdMap[qual.awardedBy],
        });
      }
    }
  },
});
```

### Step 7: Verify Convex Deployment

```bash
# Verify connection to new project
npx convex run systemSettings:getSettings

# Test authentication (if you have seed data)
npx convex run users:getUser --args '{"username":"admin"}'

# Verify data integrity
npx convex run personnel:list
```

### Step 8: Update Environment Variables

Update your local `.env.local` file:

```bash
# Update to new Convex URL
NEXT_PUBLIC_CONVEX_URL=https://your-new-project.convex.cloud
```

**Note**: Keep the old `.env.local` backed up until migration is complete.

---

## Vercel Deployment Migration

### Step 1: Create New Vercel Project

#### Option A: Via Vercel Dashboard

1. Log in to Vercel with your **target** account: https://vercel.com
2. Click "Add New" → "Project"
3. Import your Git repository
4. Select the repository and branch
5. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (or leave default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)
6. Click "Deploy" (we'll configure environment variables next)

#### Option B: Via Vercel CLI

```bash
# Log in to target account
vercel login

# Link project (in your project directory)
vercel link

# Follow prompts:
# - Select target account
# - Create new project or link existing
# - Confirm settings
```

### Step 2: Configure Environment Variables in Vercel

#### Via Dashboard

1. Go to your new Vercel project
2. Navigate to "Settings" → "Environment Variables"
3. Add the following variables:

```
NEXT_PUBLIC_CONVEX_URL=https://your-new-convex-project.convex.cloud
NEXTAUTH_SECRET=<generate-new-secret>
```

#### Generate New NextAuth Secret

```bash
# Generate a secure random secret
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Important**: Generate a NEW `NEXTAUTH_SECRET` for security. Do not reuse the old one.

#### Via Vercel CLI

```bash
# Set environment variables
vercel env add NEXT_PUBLIC_CONVEX_URL
# Enter the new Convex URL when prompted
# Select environment: Production, Preview, Development (select all)

vercel env add NEXTAUTH_SECRET
# Paste the generated secret
# Select environment: Production, Preview, Development (select all)
```

### Step 3: Configure Build Settings

Check `vercel.json` configuration:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["syd1"]
}
```

Update region if needed for your target deployment.

### Step 4: Deploy Application

#### Via Dashboard

1. Go to "Deployments" tab
2. Click "Redeploy" on the latest deployment (after env vars are set)
3. Or trigger a new deployment by pushing to your repository

#### Via CLI

```bash
# Deploy to production
vercel --prod

# Or deploy preview
vercel
```

### Step 5: Verify Deployment

1. Check deployment status in Vercel dashboard
2. Visit the deployment URL
3. Verify application loads correctly
4. Test login functionality (may need admin account setup first)

### Step 6: Custom Domain Setup (if applicable)

If you have a custom domain:

1. Go to "Settings" → "Domains"
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for DNS propagation (can take up to 48 hours)
5. SSL certificate will be automatically provisioned

### Step 7: Update Repository Connection (if needed)

If you need to connect to a different repository:

1. Go to "Settings" → "Git"
2. Disconnect current repository
3. Connect to new repository
4. Configure auto-deploy settings

---

## Application Configuration

### Step 1: Environment Variables Checklist

Verify all environment variables are set correctly:

- [ ] `NEXT_PUBLIC_CONVEX_URL` - New Convex project URL
- [ ] `NEXTAUTH_SECRET` - New secret (regenerated for security)

### Step 2: Verify Convex Connection

Test the connection locally:

```bash
# Start development server
npm run dev

# Verify Convex connection
# Check browser console for connection status
# Visit http://localhost:3000
```

### Step 3: Create Admin Account

After migration, create an initial admin account:

#### Option A: Using Create Admin Script

```bash
# The script will output a password hash
npm run create-admin

# Follow instructions to manually add to Convex dashboard
# Or use the reset-admin-password script instead
```

#### Option B: Using Reset Admin Password Script

```bash
# This creates/updates admin via Convex actions
npm run reset-admin-password:auto

# Or interactive version
npm run reset-admin-password
```

**Important**: Ensure you can log in with the admin account before proceeding.

### Step 4: Test Authentication Flow

1. Visit the deployed application
2. Navigate to `/login`
3. Attempt to log in with admin credentials
4. Verify successful authentication
5. Check that dashboard loads correctly
6. Verify role-based access control works

### Step 5: Verify Data Access

Test that migrated data is accessible:

1. Log in as admin
2. Navigate to Personnel page
3. Verify personnel records are visible
4. Check Qualifications page
5. Verify Events/Calendar page shows events
6. Test creating new records

### Step 6: Update Documentation

Update any documentation or scripts that reference:

- Old Convex project URLs
- Old Vercel deployment URLs
- Old environment variable values

---

## Post-Migration Verification

### Functional Testing Checklist

#### Authentication & Authorization

- [ ] Admin can log in successfully
- [ ] Role-based access control works (test each role)
- [ ] Password change functionality works
- [ ] Session persists correctly
- [ ] Logout works correctly

#### Personnel Management

- [ ] Personnel list displays all migrated records
- [ ] Can view personnel details
- [ ] Can create new personnel
- [ ] Can update personnel information
- [ ] Can assign ranks
- [ ] Rank history is preserved

#### Qualifications Management

- [ ] Schools list is complete
- [ ] Qualifications list is complete
- [ ] Personnel qualifications are preserved
- [ ] Can award new qualifications
- [ ] Instructor assignments are preserved

#### Events & Calendar

- [ ] Events are visible in calendar
- [ ] Event details are correct
- [ ] Event participants are preserved
- [ ] Can create new events
- [ ] Event booking codes work
- [ ] Event instructors/GMs are preserved

#### System Settings

- [ ] System settings are migrated
- [ ] Maintenance mode works (if applicable)
- [ ] System-wide configurations are correct

### Data Integrity Verification

#### Verify Record Counts

Compare record counts between source and target:

```bash
# In source project
npx convex run personnel:list | wc -l

# In target project (after switching)
npx convex run personnel:list | wc -l
```

Repeat for other critical tables:
- Personnel
- Events
- Qualifications
- User Roles
- Personnel Qualifications

#### Verify Foreign Key Relationships

Check that relationships are preserved:

1. Personnel → Rank relationships
2. Personnel → Qualifications relationships
3. Events → Instructors relationships
4. User Roles → Personnel relationships
5. Instructor Schools assignments

#### Verify Data Completeness

Spot-check random records:

1. Select 5-10 random personnel records
2. Verify all fields are present and correct
3. Check associated qualifications
4. Check rank history
5. Verify login credentials (for users with system access)

### Performance Checks

- [ ] Application loads in reasonable time (< 3 seconds)
- [ ] Database queries respond quickly
- [ ] Real-time updates work (Convex subscriptions)
- [ ] No console errors in browser
- [ ] No server errors in logs

### Rollback Procedures

If critical issues are discovered:

#### Rollback Vercel Deployment

1. Go to Vercel dashboard
2. Navigate to "Deployments"
3. Find the last working deployment
4. Click "..." → "Promote to Production"

#### Rollback Convex Project

1. Keep old Convex project active until verification is complete
2. If rollback needed:
   - Update `NEXT_PUBLIC_CONVEX_URL` back to old project
   - Redeploy Vercel
   - Investigate issues in new project

#### Communication Plan

- Notify users of potential issues
- Document any data discrepancies
- Plan fixes and re-migration if needed

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "NEXT_PUBLIC_CONVEX_URL is not set"

**Symptoms**: Application fails to load, error in console

**Solution**:
1. Verify environment variable is set in Vercel
2. Check that variable is set for correct environment (Production/Preview)
3. Redeploy application after setting variable
4. Verify variable name is exactly `NEXT_PUBLIC_CONVEX_URL`

#### Issue: Authentication Fails After Migration

**Symptoms**: Cannot log in, "Invalid credentials" error

**Possible Causes**:
1. Personnel records not migrated with password hashes
2. `isActive` field not set to `true`
3. `requirePasswordChange` causing issues
4. NextAuth secret mismatch

**Solutions**:
1. Verify personnel records have `passwordHash` field
2. Check `isActive` is `true` for user accounts
3. Reset password using admin script:
   ```bash
   npm run reset-admin-password:auto
   ```
4. Verify `NEXTAUTH_SECRET` is set correctly
5. Check Convex authentication query is working:
   ```bash
   npx convex run userActions:verifyCredentials --args '{"username":"admin","password":"test"}'
   ```

#### Issue: Data Missing After Migration

**Symptoms**: Some records don't appear, counts don't match

**Possible Causes**:
1. Import script didn't run completely
2. Foreign key references not updated
3. ID mapping failed

**Solutions**:
1. Re-run import function with proper ID mapping
2. Check Convex dashboard for imported records
3. Verify foreign key relationships
4. Use Convex dashboard to manually verify data

#### Issue: Foreign Key References Broken

**Symptoms**: Related records don't display, errors when viewing details

**Possible Causes**:
1. Old IDs not mapped to new IDs during import
2. References not updated after import

**Solutions**:
1. Run ID mapping update functions
2. Manually verify critical relationships in Convex dashboard
3. Re-import with proper ID mapping

#### Issue: Real-time Updates Not Working

**Symptoms**: Changes don't appear immediately, need to refresh

**Possible Causes**:
1. Convex client not connected
2. Wrong Convex URL in environment
3. CORS or network issues

**Solutions**:
1. Verify `NEXT_PUBLIC_CONVEX_URL` is correct
2. Check browser console for connection errors
3. Verify Convex project is accessible
4. Check network tab for WebSocket connections

#### Issue: Build Fails in Vercel

**Symptoms**: Deployment fails, build errors

**Possible Causes**:
1. Missing environment variables
2. TypeScript errors
3. Missing dependencies

**Solutions**:
1. Check build logs in Vercel dashboard
2. Verify all environment variables are set
3. Test build locally: `npm run build`
4. Check for TypeScript errors: `npm run lint`
5. Verify `package.json` dependencies are correct

#### Issue: Environment Variables Not Available at Build Time

**Symptoms**: Build succeeds but runtime errors occur

**Solution**:
- Ensure `NEXT_PUBLIC_*` variables are set in Vercel
- Variables without `NEXT_PUBLIC_` prefix are server-side only
- Redeploy after setting variables

### Data Migration Failures

#### Partial Import Failure

If import fails partway through:

1. **Stop and assess**: Don't continue if critical errors
2. **Check logs**: Review Convex function logs
3. **Identify failed records**: Note which records failed
4. **Fix issues**: Address data format or validation issues
5. **Re-run import**: Import remaining records or re-run full import

#### ID Mapping Confusion

If IDs don't match correctly:

1. Export ID mapping from import function
2. Save mapping to file for reference
3. Use mapping to update foreign keys
4. Verify all references are updated

### Authentication Problems

#### Users Can't Log In

1. Verify `passwordHash` field exists in personnel records
2. Check `isActive` is `true`
3. Verify `callSign` matches expected username
4. Test password reset functionality
5. Create new admin account as fallback

#### Session Issues

1. Verify `NEXTAUTH_SECRET` is set correctly
2. Clear browser cookies and try again
3. Check session configuration in `src/auth.ts`
4. Verify JWT strategy is working

### Environment Variable Issues

#### Variables Not Updating

1. Redeploy application after setting variables
2. Verify variables are set for correct environment
3. Check variable names match exactly (case-sensitive)
4. Clear Vercel build cache if needed

#### Wrong Values

1. Double-check values in Vercel dashboard
2. Verify Convex URL is for correct project
3. Regenerate `NEXTAUTH_SECRET` if compromised

### Getting Help

If issues persist:

1. **Check Logs**:
   - Vercel deployment logs
   - Convex function logs
   - Browser console errors
   - Server logs

2. **Document Issues**:
   - Error messages
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

3. **Rollback if Critical**:
   - Revert to old deployment
   - Investigate issues safely
   - Plan fixes before re-migration

---

## Additional Resources

- [Convex Documentation](https://docs.convex.dev)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth Documentation](https://next-auth.js.org)

---

## Migration Checklist Summary

Use this checklist to track your migration progress:

### Pre-Migration
- [ ] All prerequisites met
- [ ] Environment variables documented
- [ ] Data backed up
- [ ] Code repository ready

### Convex Migration
- [ ] New Convex project created
- [ ] Schema deployed
- [ ] Data exported from source
- [ ] Data imported to target
- [ ] Foreign keys updated
- [ ] Connection verified

### Vercel Migration
- [ ] New Vercel project created
- [ ] Repository connected
- [ ] Environment variables configured
- [ ] Application deployed
- [ ] Custom domain configured (if applicable)

### Configuration
- [ ] Admin account created
- [ ] Authentication tested
- [ ] Data access verified
- [ ] Documentation updated

### Verification
- [ ] All functional tests passed
- [ ] Data integrity verified
- [ ] Performance acceptable
- [ ] Users notified (if applicable)

### Post-Migration
- [ ] Old accounts documented for archival
- [ ] Monitoring set up
- [ ] Support team informed
- [ ] Migration documentation archived

---

**Last Updated**: [Date]
**Version**: 1.0

