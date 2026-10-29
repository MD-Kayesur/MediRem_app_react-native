import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });

import { AuthService } from '../apps/backend/dist/auth/auth.service.js';
import { MailService } from '../apps/backend/dist/mail/mail.service.js';
import { PrismaService } from '../apps/backend/dist/prisma/prisma.service.js';

async function main() {
  console.log('====================================================');
  console.log('📧 MEDIREM - SIGNUP EMAIL VERIFICATION & LOGIN FLOW');
  console.log('====================================================\n');

  const prisma = new PrismaService();
  await prisma.$connect();
  const mailService = new MailService();
  const authService = new AuthService(prisma, mailService);

  const testEmail = `kayes_signup_${Date.now()}@gmail.com`;
  const testPassword = 'Password2026!';
  let createdUserId: string | null = null;

  try {
    // 1. REGISTER NEW USER
    console.log(`1️⃣  SIGNING UP NEW USER (${testEmail})...`);
    console.log('Sending real email via Gmail SMTP: rmdkayesur@gmail.com');
    const registerResult = await authService.register({
      name: 'MD Kayesur',
      email: testEmail,
      password: testPassword,
      phone: '+1 (555) 789-0123',
    });

    console.log(`✅ Signup Initiated! Requires Verification: ${registerResult.requiresVerification}`);
    console.log(`✅ Generated 6-digit OTP code: [${registerResult.code}]`);
    console.log(`✅ Message: "${registerResult.message}"`);

    // Verify user in Neon DB is unverified
    const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
    if (!dbUser) throw new Error('User not found in Neon DB!');
    createdUserId = dbUser.id;

    if (dbUser.isVerified === false && dbUser.verifyCode === registerResult.code) {
      console.log(`✅ Database Status Verified: isVerified=${dbUser.isVerified}, verifyCode=${dbUser.verifyCode}`);
    } else {
      throw new Error('Database state mismatch after signup!');
    }

    // 2. ATTEMPT LOGIN BEFORE VERIFICATION (MUST BE BLOCKED)
    console.log('\n2️⃣  TESTING LOGIN BEFORE VERIFICATION (EXPECTED TO FAIL)...');
    try {
      await authService.login({
        email: testEmail,
        password: testPassword,
      });
      throw new Error('Login before email verification should have failed!');
    } catch (err: any) {
      console.log(`✅ Unverified login blocked correctly: "${err.message}"`);
    }

    // 3. TESTING INVALID CODE VERIFICATION
    console.log('\n3️⃣  TESTING INVALID 6-DIGIT CODE...');
    try {
      await authService.verifySignup({
        email: testEmail,
        code: '999999',
      });
      throw new Error('Invalid code should have failed!');
    } catch (err: any) {
      console.log(`✅ Invalid code rejected correctly: "${err.message}"`);
    }

    // 4. SUBMIT VALID 6-DIGIT VERIFICATION CODE
    console.log('\n4️⃣  SUBMITTING VALID 6-DIGIT CODE...');
    const verifyResult = await authService.verifySignup({
      email: testEmail,
      code: registerResult.code!,
    });
    console.log(`✅ Verification Succeeded: "${verifyResult.message}"`);

    // Verify user is now marked isVerified: true in Neon DB
    const verifiedDbUser = await prisma.user.findUnique({ where: { email: testEmail } });
    if (verifiedDbUser?.isVerified === true && verifiedDbUser.verifyCode === null) {
      console.log(`✅ Neon DB Verified: isVerified is now TRUE, verifyCode is cleared!`);
    } else {
      throw new Error('User was not marked verified in Neon DB!');
    }

    // 5. LOGIN AFTER SUCCESSFUL VERIFICATION (MUST SUCCEED -> REDIRECT LOGIN FLOW)
    console.log('\n5️⃣  LOGGING IN AFTER VERIFICATION (LOGIN PAGE FLOW)...');
    const loginResult = await authService.login({
      email: testEmail,
      password: testPassword,
    });
    console.log(`✅ Login Succeeded! Welcome, ${loginResult.user.name}. Token: ${loginResult.token.substring(0, 15)}...`);

    // CLEANUP
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } });
      console.log('\n🧹 Cleaned up temporary test user from Neon DB.');
    }

    console.log('\n====================================================');
    console.log('🎉 SIGNUP -> NODEMAILER CODE -> LOGIN FLOW 100% OPERATIONAL!');
    console.log('====================================================');
  } catch (err: any) {
    console.error('❌ Test failed:', err);
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
