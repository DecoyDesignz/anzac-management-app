/**
 * Emergency Password Reset Script for Super Admin Account
 * 
 * Use this script when the super admin password is lost.
 * 
 * USAGE:
 *   npm run reset-admin-password
 * 
 * This will generate a new password hash that you can manually update
 * in the Convex dashboard.
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
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
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

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   🚨 EMERGENCY SUPER ADMIN PASSWORD RESET 🚨              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("This script will help you reset the super admin password.");
  console.log("You'll need access to the Convex dashboard to complete this.\n");

  // Step 1: Get username
  const username = await promptUser("Enter the super admin username (or press Enter for default 'admin'): ");
  const adminUsername = username || "admin";

  // Step 2: Ask if they want to generate a password or provide their own
  const choice = await promptUser("\nGenerate a random password or provide your own? (g/p) [g]: ");
  
  let newPassword: string;
  if (choice.toLowerCase() === 'p') {
    newPassword = await promptUser("Enter your desired password (min 8 chars, must include uppercase, lowercase, number): ");
    
    // Validate password
    if (newPassword.length < 8) {
      console.error("\n❌ Error: Password must be at least 8 characters long.");
      process.exit(1);
    }
    if (!/[A-Z]/.test(newPassword)) {
      console.error("\n❌ Error: Password must contain at least one uppercase letter.");
      process.exit(1);
    }
    if (!/[a-z]/.test(newPassword)) {
      console.error("\n❌ Error: Password must contain at least one lowercase letter.");
      process.exit(1);
    }
    if (!/[0-9]/.test(newPassword)) {
      console.error("\n❌ Error: Password must contain at least one number.");
      process.exit(1);
    }
  } else {
    newPassword = generateSecurePassword(16);
  }

  // Hash the password using scrypt (same method as the app)
  const salt = "anzac-management-salt";
  const passwordHashBuffer = await scryptAsync(newPassword, salt, 64) as Buffer;
  const passwordHash = passwordHashBuffer.toString('hex');

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   ✅ PASSWORD HASH GENERATED                              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("📋 New Credentials:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`Username: ${adminUsername}`);
  console.log(`Password: ${newPassword}`);
  console.log(`Password Hash: ${passwordHash}`);
  console.log("─────────────────────────────────────────────────────────────\n");

  console.log("⚠️  SAVE THESE CREDENTIALS SECURELY! ⚠️\n");

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   📝 MANUAL RESET INSTRUCTIONS                            ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("Follow these steps to reset the password:\n");

  console.log("1️⃣  Go to your Convex Dashboard:");
  console.log("   https://dashboard.convex.dev\n");

  console.log("2️⃣  Navigate to:");
  console.log("   Your Project → Data → systemUsers table\n");

  console.log("3️⃣  Find the super admin user:");
  console.log(`   Look for the user with name: "${adminUsername}"\n`);

  console.log("4️⃣  Click on the user to edit it\n");

  console.log("5️⃣  Update the following fields:");
  console.log(`   passwordHash: "${passwordHash}"`);
  console.log("   requirePasswordChange: false");
  console.log(`   lastPasswordChange: ${Date.now()}\n`);

  console.log("6️⃣  Click 'Save' to apply changes\n");

  console.log("7️⃣  You can now log in with:");
  console.log(`   Username: ${adminUsername}`);
  console.log(`   Password: ${newPassword}\n`);

  console.log("─────────────────────────────────────────────────────────────\n");
  console.log("💡 TIP: If the user doesn't exist, you may need to create it");
  console.log("   first using the create-admin script.\n");

  console.log("🔒 SECURITY REMINDER:");
  console.log("   After logging in, consider changing the password through");
  console.log("   the application's settings page for better security.\n");

  console.log("─────────────────────────────────────────────────────────────\n");
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});

