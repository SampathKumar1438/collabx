import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Default from email (must be verified in Resend or use their test domain)
const FROM_EMAIL = process.env.EMAIL_FROM || 'CollabX <onboarding@resend.dev>';

export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>You requested to reset your password. Click the button below to reset it:</p>
                <p style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'CollabX'}. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error(`Error sending password reset email to ${email}:`, error);
    throw error;
  }
};

export const sendVerificationEmail = async (email, otp) => {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify Your Email Address - OTP',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }
              .otp-box { 
                font-size: 32px; 
                font-weight: bold; 
                letter-spacing: 5px; 
                color: #667eea; 
                background: #fff; 
                padding: 15px 30px; 
                border-radius: 8px; 
                border: 1px dashed #667eea;
                margin: 20px auto;
                display: inline-block;
              }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to ${process.env.APP_NAME || 'CollabX'}!</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>Thank you for registering! Please use the following One-Time Password (OTP) to verify your email address and activate your account.</p>
                
                <div class="otp-box">${otp}</div>
                
                <p><strong>This OTP is valid for 1 hour.</strong></p>
                <p>If you didn't create an account, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'CollabX'}. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    console.log(`Verification OTP sent to ${email}`);
  } catch (error) {
    console.error(`Error sending email to ${email}:`, error);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV ONLY] OTP for ${email}: ${otp}`);
    }
    throw error;
  }
};

export const sendPasswordResetOTP = async (email, otp) => {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Password Reset OTP',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }
              .otp-box { 
                font-size: 32px; 
                font-weight: bold; 
                letter-spacing: 5px; 
                color: #667eea; 
                background: #fff; 
                padding: 15px 30px; 
                border-radius: 8px; 
                border: 1px dashed #667eea;
                margin: 20px auto;
                display: inline-block;
              }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>You requested to reset your password. Please use the following One-Time Password (OTP) to reset it:</p>
                
                <div class="otp-box">${otp}</div>
                
                <p><strong>This OTP is valid for 1 hour.</strong></p>
                <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'CollabX'}. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    console.log(`Password reset OTP sent to ${email}`);
  } catch (error) {
    console.error(`Error sending email to ${email}:`, error);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV ONLY] OTP for ${email}: ${otp}`);
    }
    throw error;
  }
};
