/**
 * Script to create an initial admin user
 * Run this with: npx ts-node scripts/create-admin.ts
 * 
 * You'll need to install ts-node if you haven't:
 * npm install --save-dev ts-node
 */

import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function main() {
  // Configuration - Change these values
  const adminUser = {
    email: "admin@anzac.mil",
    name: "System Administrator",
    password: "Admin123!", // Change this to a secure password
    role: "super_admin" as const,
  };

  // Generate a unique cryptographically secure salt for this user
  const salt = randomBytes(32).toString('hex'); // 32 bytes = 256 bits, hex encoded
  const passwordHashBuffer = await scryptAsync(adminUser.password, salt, 64) as Buffer;
  const passwordHash = passwordHashBuffer.toString('hex');

  console.log("\n=== Create Admin User ===\n");
  console.log("Copy the following information:\n");
  console.log(`Email: ${adminUser.email}`);
  console.log(`Name: ${adminUser.name}`);
  console.log(`Role: ${adminUser.role}`);
  console.log(`Password Hash: ${passwordHash}`);
  console.log(`Password Salt: ${salt}\n`);
  
  console.log("Next steps:");
  console.log("1. Go to your Convex dashboard: https://dashboard.convex.dev");
  console.log("2. Navigate to your project > Data");
  console.log("3. Open the 'personnel' table (or 'systemUsers' if using legacy table)");
  console.log("4. Click 'Add Document'");
  console.log("5. Add the following fields:");
  console.log(`   - callSign: "${adminUser.name}"`);
  console.log(`   - email: "${adminUser.email}"`);
  console.log(`   - passwordHash: "${passwordHash}"`);
  console.log(`   - passwordSalt: "${salt}"`);
  console.log(`   - isActive: true`);
  console.log(`   - requirePasswordChange: false`);
  console.log(`   - lastPasswordChange: ${Date.now()}`);
  console.log("\n6. Click 'Save'");
  console.log("\n7. You can now log in with:");
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Password: ${adminUser.password}`);
  console.log("\n⚠️  IMPORTANT: Change this password after your first login!\n");
}

main().catch(console.error);

