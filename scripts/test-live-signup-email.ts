import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });

import { MailService } from '../apps/backend/dist/mail/mail.service.js';

async function main() {
  console.log('Testing live signup email via Nodemailer & Gmail...');
  const mailService = new MailService();

  const targetEmail = 'rmdkayesur@gmail.com';
  const testCode = Math.floor(100000 + Math.random() * 900000).toString();

  console.log(`Sending 6-digit signup OTP [${testCode}] to ${targetEmail}...`);
  const result = await mailService.sendSignupVerificationOtp(
    targetEmail,
    'MD Kayesur',
    testCode,
  );

  if (result.success) {
    console.log(`🎉 SUCCESS! Email delivered to ${targetEmail} via Gmail SMTP.`);
    console.log(`MessageId: ${result.messageId}`);
  } else {
    console.error('❌ Failed to send email.');
    process.exit(1);
  }
}

main().catch(console.error);

