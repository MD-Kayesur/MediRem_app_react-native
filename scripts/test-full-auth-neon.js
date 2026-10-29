require('dotenv').config({ path: './apps/backend/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log('--- STEP 1: Querying current Neon DB users ---');
  let users = await prisma.user.findMany({ select: { id: true, email: true, name: true, isVerified: true } });
  console.log(`Current users in Neon DB (${users.length}):`, users);

  const testEmail = 'rmdkayesur@gmail.com';
  const testName = 'MD Kayesur';
  const testPassword = 'Password123!';

  console.log(`\n--- STEP 2: Calling POST /api/auth/register for ${testEmail} ---`);
  const registerRes = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
    }),
  });

  const registerData = await registerRes.json();
  console.log('Registration response status:', registerRes.status);
  console.log('Registration response body:', registerData);

  if (!registerRes.ok) {
    throw new Error(`Registration failed: ${JSON.stringify(registerData)}`);
  }

  console.log('\n--- STEP 3: Checking Neon DB for the newly created user record ---');
  const userInDb = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  console.log('Found user in Neon PostgreSQL:', {
    id: userInDb.id,
    name: userInDb.name,
    email: userInDb.email,
    isVerified: userInDb.isVerified,
    verifyCode: userInDb.verifyCode,
    verifyCodeExpiresAt: userInDb.verifyCodeExpiresAt,
  });

  if (!userInDb) {
    throw new Error('User was NOT found in Neon DB!');
  }
  console.log('✅ User is confirmed created in Neon DB!');

  console.log(`\n--- STEP 4: Verifying account using OTP code [${userInDb.verifyCode}] ---`);
  const verifyRes = await fetch('http://localhost:3000/api/auth/verify-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      code: userInDb.verifyCode,
    }),
  });

  const verifyData = await verifyRes.json();
  console.log('Verification response status:', verifyRes.status);
  console.log('Verification response body:', verifyData);

  console.log('\n--- STEP 5: Confirming user is verified in Neon DB ---');
  const verifiedUser = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  console.log('Verified user state in Neon DB:', {
    id: verifiedUser.id,
    email: verifiedUser.email,
    isVerified: verifiedUser.isVerified,
    verifyCode: verifiedUser.verifyCode,
  });

  if (!verifiedUser.isVerified) {
    throw new Error('User is still not marked verified in DB!');
  }

  console.log('\n--- STEP 6: Testing Login with password ---');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  const loginData = await loginRes.json();
  console.log('Login response status:', loginRes.status);
  console.log('Login result user:', loginData.user);

  console.log('\n--- ALL NEON DB USERS NOW ---');
  users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, isVerified: true, createdAt: true },
  });
  console.table(users);
  console.log('\n🎉 ALL TESTS PASSED! User creation and verification are 100% working on Neon DB!');
}

runTest()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

