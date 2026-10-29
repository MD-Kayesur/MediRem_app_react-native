import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private async initTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      });
      this.logger.log(`Nodemailer configured with SMTP host: ${host}`);
    } else {
      // In development / demo mode, create an Ethereal test account or local stream transporter
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        this.logger.log(`Nodemailer initialized with Ethereal test mailbox (${testAccount.user})`);
      } catch (err: any) {
        // Fallback to json transport if ethereal is unreachable
        this.transporter = nodemailer.createTransport({
          jsonTransport: true,
        });
        this.logger.warn(`Nodemailer initialized with JSON fallback transporter: ${err.message}`);
      }
    }
  }

  /**
   * Send 6-digit OTP verification code for Password Reset
   */
  async sendPasswordResetOtp(
    toEmail: string,
    userName: string,
    code: string,
  ): Promise<{ success: boolean; messageId?: string; previewUrl?: string }> {
    if (!this.transporter) {
      await this.initTransporter();
    }

    const fromAddress = process.env.SMTP_FROM || '"MediRem Health" <no-reply@medirem.app>';
    const appName = 'MediRem';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MediRem Password Reset Code</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 20px; background: linear-gradient(135deg, #0EA5E9 0%, #208AEF 50%, #10B981 100%); text-align: center;">
              <div style="display: inline-block; background: #FFFFFF; width: 56px; height: 56px; border-radius: 16px; line-height: 56px; font-size: 28px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                💊
              </div>
              <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 12px 0 4px; letter-spacing: -0.5px;">${appName}</h1>
              <p style="color: rgba(255,255,255,0.9); font-size: 13px; margin: 0; font-weight: 500;">Your Smart Medication Companion</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 20px;">
              <h2 style="font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 12px;">Reset Your Password 🔐</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
                Hello <strong>${userName}</strong>,<br>
                We received a request to reset the password for your ${appName} account. Enter the 6-digit verification code below in your MediRem mobile app:
              </p>

              <!-- OTP Box -->
              <div style="background-color: #EFF6FF; border: 2px dashed #3B82F6; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #1D4ED8; display: inline-block;">
                  ${code}
                </span>
                <p style="font-size: 12px; color: #64748B; margin: 8px 0 0; font-weight: 600;">
                  ⏱️ Valid for 15 minutes
                </p>
              </div>

              <p style="font-size: 13px; line-height: 1.6; color: #64748B; margin: 0 0 12px;">
                ⚠️ <strong>Security Notice:</strong> Never share this code with anyone. MediRem support will never ask you for your verification code.
              </p>
              <p style="font-size: 13px; line-height: 1.6; color: #64748B; margin: 0;">
                If you did not request a password reset, you can safely ignore this email. Your account remains completely secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="font-size: 12px; color: #94A3B8; margin: 0;">
                © ${new Date().getFullYear()} MediRem Inc. • Medication & Health Management
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    try {
      const info = await this.transporter!.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `[${code}] Your MediRem Password Reset Verification Code`,
        text: `Hello ${userName},\n\nYour MediRem verification code is: ${code}\n\nThis code expires in 15 minutes. If you did not request this, please ignore this email.`,
        html: htmlContent,
      });

      let previewUrl: string | undefined;
      const getTestMessageUrl = (nodemailer as any).getTestMessageUrl;
      if (typeof getTestMessageUrl === 'function') {
        const testUrl = getTestMessageUrl(info);
        if (testUrl) {
          previewUrl = testUrl;
          this.logger.log(`📧 Ethereal Email Preview: ${previewUrl}`);
        }
      }

      this.logger.log(`✅ Verification email sent to ${toEmail} (MessageId: ${info.messageId || 'sent'})`);
      return { success: true, messageId: info.messageId, previewUrl };
    } catch (err: any) {
      this.logger.error(`❌ Failed to send email via nodemailer: ${err.message}`);
      // Fallback: still log the OTP code to server console so user or developer is never blocked
      this.logger.warn(`🔑 [DEV FALLBACK] Verification code for ${toEmail}: ${code}`);
      return { success: false, previewUrl: undefined };
    }
  }
}
