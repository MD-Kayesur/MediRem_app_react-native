const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'rmdkayesur@gmail.com',
    pass: 'iwkzgeahuuqtrhef',
  },
});

async function testGmail() {
  try {
    console.log('Verifying Gmail SMTP connection...');
    await transporter.verify();
    console.log('✅ GMAIL_SMTP_SUCCESS: Successfully authenticated with Google SMTP servers!');

    console.log('Sending test verification email to rmdkayesur@gmail.com...');
    const info = await transporter.sendMail({
      from: '"MediRem Health" <rmdkayesur@gmail.com>',
      to: 'rmdkayesur@gmail.com',
      subject: '💊 MediRem Email Verification Setup Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #208AEF;">MediRem Email Service Connected!</h2>
          <p>Your Nodemailer Gmail integration is active and ready to send verification codes.</p>
        </div>
      `,
    });
    console.log('✅ Email sent successfully! MessageId:', info.messageId);
  } catch (err) {
    console.error('❌ Gmail SMTP error:', err.message);
    process.exit(1);
  }
}

testGmail();
