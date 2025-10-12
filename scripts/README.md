# Admin & Recovery Scripts

This directory contains administrative and emergency recovery scripts for the ANZAC Management System.

## 📋 Available Scripts

### 1. Create Initial Admin User

**Purpose:** Create the first super admin account when setting up the system.

**Usage:**
```bash
npm run create-admin
```

**What it does:**
- Generates a password hash for the default admin credentials
- Provides step-by-step instructions to manually create the admin user in Convex dashboard
- Default username: "System Administrator"
- Default email: "admin@anzac.mil"

**When to use:**
- Fresh installation of the system
- No admin accounts exist yet
- Setting up a new environment

---

### 2. Reset Admin Password (Manual)

**Purpose:** Emergency password reset when super admin access is lost.

**Usage:**
```bash
npm run reset-admin-password
```

**What it does:**
- Interactive script that prompts for username
- Generates a secure random password (or accepts custom password)
- Creates password hash compatible with the system
- Provides detailed manual update instructions

**Features:**
- ✅ Password validation (min 8 chars, uppercase, lowercase, number)
- ✅ Secure random password generation
- ✅ Step-by-step dashboard instructions
- ✅ No risk of accidental database modification

**When to use:**
- Super admin password is forgotten
- Account is locked
- Emergency access recovery needed

**Example:**
```bash
$ npm run reset-admin-password

Enter the super admin username (or press Enter for default 'admin'): admin
Generate a random password or provide your own? (g/p) [g]: g

✅ PASSWORD HASH GENERATED

New Credentials:
─────────────────────────────────────────────────────────────
Username: admin
Password: Xy9#mK2$pL6@nQ4!
Password Hash: a1b2c3d4e5f6...
─────────────────────────────────────────────────────────────

⚠️  SAVE THESE CREDENTIALS SECURELY! ⚠️

[Manual update instructions follow...]
```

---

### 3. Reset Admin Password (Automated - Future)

**Purpose:** Automated password reset using Convex Deploy Key.

**Usage:**
```bash
CONVEX_DEPLOY_KEY=your-key npm run reset-admin-password:auto
```

**Status:** 🚧 Not yet implemented for security reasons

**Note:** For now, this script will generate credentials and redirect you to manual update process. Automated database modification is disabled to prevent accidental data loss.

---

## 🚨 Emergency Recovery Procedure

If you've lost access to the super admin account, follow these steps:

### Step 1: Run the Reset Script
```bash
npm run reset-admin-password
```

### Step 2: Access Convex Dashboard
1. Go to [https://dashboard.convex.dev](https://dashboard.convex.dev)
2. Log in with your Convex account
3. Select your ANZAC Management project

### Step 3: Navigate to Database
1. Click on **"Data"** in the sidebar
2. Select the **"systemUsers"** table
3. Find the user with the username you specified (usually "admin")

### Step 4: Update Password Hash
1. Click on the user record to edit it
2. Update the following fields:
   - `passwordHash`: (paste the hash from script output)
   - `requirePasswordChange`: `false`
   - `lastPasswordChange`: (use timestamp from script output)
3. Click **"Save"**

### Step 5: Log In
1. Go to your application login page
2. Enter the username and new password from the script
3. You should now have access!

### Step 6: (Optional) Change Password
For better security, consider changing the password through the application's settings page after logging in.

---

## 🔐 Security Best Practices

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- Recommended: Include special characters

### Storage
- **Never** commit credentials to version control
- Store passwords in a secure password manager
- Don't share passwords via unencrypted channels (email, Slack, etc.)

### Recovery Access
- Keep your Convex dashboard credentials secure
- Enable 2FA on your Convex account
- Document recovery procedures for your team

### Regular Maintenance
- Rotate super admin passwords regularly
- Remove unused admin accounts
- Audit user access levels quarterly

---

## 🛠️ Troubleshooting

### "User not found"
**Problem:** The specified username doesn't exist in the database.

**Solution:** Use the `create-admin` script to create a new admin user first.

### "Password hash doesn't work"
**Problem:** User can't log in with the generated password.

**Solution:** 
1. Double-check the password hash was copied correctly
2. Ensure no extra spaces or characters
3. Verify the username matches exactly (case-sensitive)

### "Can't access Convex dashboard"
**Problem:** Don't have access to the Convex account.

**Solution:** 
1. Contact the project owner for access
2. If owner is unavailable, you may need to redeploy with a new Convex project
3. Ensure you're logged into the correct Convex organization

### "Script won't run"
**Problem:** Script execution fails.

**Solution:**
```bash
# The scripts use tsx which is automatically run via npx
# Make sure you're in the project root directory
cd /path/to/anzac-management-app

# Try running directly with npx
npx tsx scripts/reset-admin-password.ts
```

---

## 📞 Support

If you encounter issues not covered here:

1. Check the main project README
2. Review Convex documentation: [https://docs.convex.dev](https://docs.convex.dev)
3. Contact the development team
4. Check the application logs for error details

---

## 📝 Notes

- All scripts use the same password hashing algorithm (scrypt) as the application
- The salt value is hardcoded in the application (`anzac-management-salt`)
- Password hashes are deterministic - same password + salt = same hash
- Scripts are safe to run multiple times
- No database modifications occur from the scripts themselves (manual update required)

---

## 🔄 Version History

- **v1.0** - Initial create-admin script
- **v1.1** - Added interactive password reset script
- **v1.2** - Added automated reset script (placeholder)
- **v1.3** - Enhanced security validations and documentation

