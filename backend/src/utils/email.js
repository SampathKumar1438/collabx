import * as postmark from 'postmark';

// Lazy Postmark Client initialization to prevent crashes on startup
let _client = null;

const getClient = () => {
  if (!_client) {
    const token = process.env.POSTMARK_API_TOKEN;
    if (!token) {
      console.warn('POSTMARK_API_TOKEN not set - emails will fail');
      return null;
    }
    _client = new postmark.ServerClient(token);
    console.log('Postmark client initialized');
  }
  return _client;
};

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@collabx.com';
const APP_NAME = process.env.APP_NAME || 'CollabX';
const LOGO_URL = process.env.LOGO_URL || 'https://raw.githubusercontent.com/SampathKumar1438/collabx/main/frontend/public/collabx.png';

// Theme Colors (from tailwind.config.js)
const COLORS = {
  primary: '#FFAB00',
  secondary: '#F9A825',
  dark: '#2D2D2D',
  lightBg: '#FFFBF0',
  text: '#4A4A4A',
  white: '#FFFFFF'
};

// Common email styles
const getEmailStyles = () => `
  body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: ${COLORS.text}; margin: 0; padding: 0; background-color: ${COLORS.lightBg}; }
  .wrapper { background-color: ${COLORS.lightBg}; padding: 40px 20px; }
  .container { max-width: 600px; margin: 0 auto; background: ${COLORS.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%); color: white; padding: 40px 30px; text-align: center; }
  .header img { max-width: 80px; margin-bottom: 16px; }
  .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 40px 30px; text-align: center; }
  .content p { margin: 0 0 16px; color: ${COLORS.text}; }
  .button { display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%); color: ${COLORS.white}; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
  .otp-box { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: ${COLORS.primary}; background: ${COLORS.lightBg}; padding: 20px 40px; border-radius: 12px; border: 2px dashed ${COLORS.primary}; margin: 24px auto; display: inline-block; }
  .link { word-break: break-all; color: ${COLORS.primary}; font-size: 14px; }
  .footer { text-align: center; padding: 24px 30px; background: ${COLORS.lightBg}; color: ${COLORS.text}; font-size: 12px; }
`;

export const sendPasswordResetEmail = async (email, resetToken) => {
  const client = getClient();
  if (!client) throw new Error('Email service not configured');

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  await client.sendEmail({
    From: FROM_EMAIL,
    To: email,
    Subject: 'Password Reset Request - CollabX',
    HtmlBody: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"><style>${getEmailStyles()}</style></head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <img src="${LOGO_URL}" alt="${APP_NAME}" />
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>You requested to reset your password. Click the button below:</p>
                <a href="${resetUrl}" class="button">Reset Password</a>
                <p style="margin-top: 24px;">Or copy this link:</p>
                <p class="link">${resetUrl}</p>
                <p><strong>This link expires in 1 hour.</strong></p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    MessageStream: 'outbound'
  });
  console.log(`Password reset email sent to ${email}`);
};

export const sendVerificationEmail = async (email, otp) => {
  const client = getClient();
  if (!client) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV ONLY] OTP for ${email}: ${otp}`);
    }
    throw new Error('Email service not configured');
  }

  await client.sendEmail({
    From: FROM_EMAIL,
    To: email,
    Subject: 'Verify Your Email - CollabX',
    HtmlBody: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"><style>${getEmailStyles()}</style></head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <img src="${LOGO_URL}" alt="${APP_NAME}" />
                <h1>Welcome to ${APP_NAME}!</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>Thank you for registering! Use this OTP to verify your email:</p>
                <div class="otp-box">${otp}</div>
                <p><strong>This OTP is valid for 1 hour.</strong></p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    MessageStream: 'outbound'
  });
  console.log(`Verification OTP sent to ${email}`);
};

export const sendPasswordResetOTP = async (email, otp) => {
  const client = getClient();
  if (!client) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV ONLY] OTP for ${email}: ${otp}`);
    }
    throw new Error('Email service not configured');
  }

  await client.sendEmail({
    From: FROM_EMAIL,
    To: email,
    Subject: 'Password Reset OTP - CollabX',
    HtmlBody: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"><style>${getEmailStyles()}</style></head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <img src="${LOGO_URL}" alt="${APP_NAME}" />
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>Use this OTP to reset your password:</p>
                <div class="otp-box">${otp}</div>
                <p><strong>This OTP is valid for 1 hour.</strong></p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    MessageStream: 'outbound'
  });
  console.log(`Password reset OTP sent to ${email}`);
};
