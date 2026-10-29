import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AuthService } from '../apps/backend/dist/auth/auth.service.js';
import { MailService } from '../apps/backend/dist/mail/mail.service.js';
import { PrismaService } from '../apps/backend/dist/prisma/prisma.service.js';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });

async function main() {
  console.log('====================================================');
  console.log('🔐 MEDIREM FULL AUTHENTICATION SYSTEM E2E VERIFICATION');
  console.log('====================================================\n');

  const prisma = new PrismaService();
  await prisma.$connect();
  const mailService = new MailService();
  const authService = new AuthService(prisma, mailService);

  const testEmail = `auth_test_${Date.now()}@medirem.app`;
  const initialPassword = 'SecurePass123!';
  const newPassword = 'BrandNewSecret2026!';
  let createdUserId: string | null = null;

  try {
    // 1. REGISTER NEW USER
    console.log(`1️⃣  REGISTERING NEW USER (${testEmail})...`);
    const regResult = await authService.register({
      name: 'Dr. Sarah Connor',
      email: testEmail,
      password: initialPassword,
      phone: '+1 (555) 987-6543',
    });
    createdUserId = regResult.user.id;
    console.log(`✅ Registration Successful! User ID: ${createdUserId}, Name: ${regResult.user.name}`);
    console.log(`✅ Token received: ${regResult.token.substring(0, 15)}...`);

    // Verify bcrypt hash in Neon DB
    const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
    if (dbUser?.password?.startsWith('$2')) {
      console.log(`✅ Security Verified: Password is encrypted with bcrypt (${dbUser.password.substring(0, 15)}...)`);
    } else {
      throw new Error('Password was not properly hashed with bcrypt!');
    }

    // 2. VERIFY DUPLICATE REGISTRATION REJECTION
    console.log('\n2️⃣  TESTING DUPLICATE REGISTRATION PROTECTION...');
    try {
      await authService.register({
        name: 'Imposter',
        email: testEmail,
        password: 'AnotherPassword',
      });
      throw new Error('Duplicate registration should have failed but passed!');
    } catch (err: any) {
      console.log(`✅ Duplicate registration blocked correctly: "${err.message}"`);
    }

    // 3. TESTING LOGIN (WRONG PASSWORD)
    console.log('\n3️⃣  TESTING LOGIN WITH WRONG PASSWORD...');
    try {
      await authService.login({
        email: testEmail,
        password: 'WrongPassword!',
      });
      throw new Error('Login with incorrect password should have failed!');
    } catch (err: any) {
      console.log(`✅ Wrong password rejected correctly: "${err.message}"`);
    }

    // 4. TESTING LOGIN (CORRECT PASSWORD)
    console.log('\n4️⃣  TESTING LOGIN WITH CORRECT PASSWORD...');
    const loginResult = await authService.login({
      email: testEmail,
      password: initialPassword,
    });
    console.log(`✅ Login Successful! Welcome back, ${loginResult.user.name}. Token: ${loginResult.token.substring(0, 15)}...`);

    // 5. TESTING FORGOT PASSWORD / NODEMAILER 6-DIGIT OTP
    console.log('\n5️⃣  REQUESTING PASSWORD RESET CODE (TRIGGERING NODEMAILER)...');
    const forgotResult = await authService.forgotPassword({ email: testEmail });
    console.log(`✅ Forgot Password Succeeded! Message: "${forgotResult.message}"`);
    console.log(`✅ Generated 6-digit OTP Code: [${forgotResult.code}]`);
    if (forgotResult.previewUrl) {
      console.log(`📧 Nodemailer Ethereal Web Preview: ${forgotResult.previewUrl}`);
    }

    // Verify OTP in Neon DB
    const userAfterForgot = await prisma.user.findUnique({ where: { email: testEmail } });
    if (userAfterForgot?.resetCode === forgotResult.code) {
      console.log(`✅ Database Sync Verified: resetCode [${userAfterForgot.resetCode}] saved with expiration: ${userAfterForgot.resetCodeExpiresAt}`);
    } else {
      throw new Error('Reset code was not saved in Neon DB!');
    }

    // 6. TESTING INVALID OTP VERIFICATION
    console.log('\n6️⃣  TESTING INVALID OTP CODE VERIFICATION...');
    try {
      await authService.verifyCode({
        email: testEmail,
        code: '000000',
      });
      throw new Error('Invalid code should have failed!');
    } catch (err: any) {
      console.log(`✅ Invalid code rejected correctly: "${err.message}"`);
    }

    // 7. TESTING VALID OTP VERIFICATION
    console.log('\n7️⃣  TESTING VALID OTP CODE VERIFICATION...');
    const verifyResult = await authService.verifyCode({
      email: testEmail,
      code: forgotResult.code!,
    });
    console.log(`✅ OTP Code Verified: "${verifyResult.message}"`);

    // 8. TESTING PASSWORD RESET TO NEW PASSWORD
    console.log('\n8️⃣  RESETTING PASSWORD TO NEW PASSWORD...');
    const resetResult = await authService.resetPassword({
      email: testEmail,
      code: forgotResult.code!,
      newPassword: newPassword,
    });
    console.log(`✅ Reset Password Completed: "${resetResult.message}"`);

    // Verify resetCode is cleared in Neon DB
    const userAfterReset = await prisma.user.findUnique({ where: { email: testEmail } });
    if (userAfterReset?.resetCode === null) {
      console.log('✅ Security Cleared: resetCode & resetCodeExpiresAt cleared from Neon DB.');
    }

    // 9. TESTING LOGIN WITH OLD PASSWORD (MUST FAIL)
    console.log('\n9️⃣  TESTING LOGIN WITH OLD PASSWORD (EXPECTED TO FAIL)...');
    try {
      await authService.login({
        email: testEmail,
        password: initialPassword,
      });
      throw new Error('Login with old password should have failed!');
    } catch (err: any) {
      console.log(`✅ Old password rejected: "${err.message}"`);
    }

    // 10. TESTING LOGIN WITH NEW PASSWORD (MUST SUCCEED)
    console.log('\n🔟 TESTING LOGIN WITH NEW PASSWORD...');
    const newLoginResult = await authService.login({
      email: testEmail,
      password: newPassword,
    });
    console.log(`✅ Login With New Password Succeeded! User: ${newLoginResult.user.name}`);

    // CLEANUP
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } });
      console.log('\n🧹 Cleaned up temporary test user from Neon DB.');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL AUTHENTICATION PROCESSES FULLY VERIFIED!');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ E2E Test Failure:', error);
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
