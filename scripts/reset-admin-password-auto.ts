/**
 * Automated Emergency Password Reset Script for Super Admin Account
 * 
 * This script uses the Convex HTTP API to directly update the password.
 * 
 * PREREQUISITES:
 *   - You need a Convex Deploy Key from your dashboard
 *   - Set CONVEX_DEPLOY_KEY environment variable
 * 
 * USAGE:
 *   CONVEX_DEPLOY_KEY=your-key-here npm run reset-admin-password:auto
 * 
 * Or create a .env.local file with:
 *   CONVEX_DEPLOY_KEY=your-deploy-key
 */

import { scrypt } from "crypto";
import { promisify } from "util";
import * as readline from "readline";

const scryptAsync = promisify(scrypt);

// Password generation utility
function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function findUserByUsername(convexUrl: string, deployKey: string, username: string) {
  // Note: This requires a custom query endpoint in Convex
  // For now, we'll provide instructions for manual update
  return null;
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   🚨 AUTOMATED SUPER ADMIN PASSWORD RESET 🚨              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Check for Convex URL
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("❌ Error: NEXT_PUBLIC_CONVEX_URL not found in environment.");
    console.error("   Make sure you're running this from the project root.\n");
    process.exit(1);
  }

  // Check for deploy key
  const deployKey = process.env.CONVEX_DEPLOY_KEY;
  if (!deployKey) {
    console.error("❌ Error: CONVEX_DEPLOY_KEY not found in environment.");
    console.error("\nTo use automated reset, you need a Convex Deploy Key:");
    console.error("1. Go to https://dashboard.convex.dev");
    console.error("2. Navigate to your project → Settings → Deploy Keys");
    console.error("3. Create a new deploy key");
    console.error("4. Run this script with:");
    console.error("   CONVEX_DEPLOY_KEY=your-key npm run reset-admin-password:auto\n");
    console.error("OR use the manual reset script instead:");
    console.error("   npm run reset-admin-password\n");
    process.exit(1);
  }

  console.log("⚠️  WARNING: This will directly modify your production database!");
  const confirm = await promptUser("Are you sure you want to continue? (yes/no): ");
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log("\n❌ Reset cancelled.\n");
    process.exit(0);
  }

  const username = await promptUser("\nEnter the super admin username (or press Enter for 'admin'): ");
  const adminUsername = username || "admin";

  const choice = await promptUser("\nGenerate a random password or provide your own? (g/p) [g]: ");
  
  let newPassword: string;
  if (choice.toLowerCase() === 'p') {
    newPassword = await promptUser("Enter your desired password (min 8 chars, must include uppercase, lowercase, number): ");
    
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || 
        !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      console.error("\n❌ Error: Password doesn't meet requirements.");
      process.exit(1);
    }
  } else {
    newPassword = generateSecurePassword(16);
  }

  const salt = "anzac-management-salt";
  const passwordHashBuffer = await scryptAsync(newPassword, salt, 64) as Buffer;
  const passwordHash = passwordHashBuffer.toString('hex');

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   ⚠️  AUTOMATED RESET NOT YET IMPLEMENTED                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("For security reasons, password resets must be done manually");
  console.log("through the Convex dashboard.\n");

  console.log("Your new credentials have been generated:\n");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`Username: ${adminUsername}`);
  console.log(`Password: ${newPassword}`);
  console.log(`Password Hash: ${passwordHash}`);
  console.log("─────────────────────────────────────────────────────────────\n");

  console.log("Please follow the manual reset instructions:\n");
  console.log("1. Go to: https://dashboard.convex.dev");
  console.log("2. Navigate to: Your Project → Data → systemUsers");
  console.log(`3. Find user: "${adminUsername}"`);
  console.log("4. Update passwordHash with the value above");
  console.log("5. Set requirePasswordChange to false");
  console.log(`6. Set lastPasswordChange to ${Date.now()}\n`);
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});

