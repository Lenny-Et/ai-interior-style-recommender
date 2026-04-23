import nodemailer from 'nodemailer';

// Create a transporter (using Gmail for development)
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'aura.interiors.demo@gmail.com',
      pass: process.env.EMAIL_PASS || 'demo-password'
    }
  });
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Aura Interiors <noreply@aurainteriors.com>',
      to: email,
      subject: 'Reset Your Password - Aura Interiors',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="color: white; font-size: 24px;">✨</span>
            </div>
            <h1 style="color: #333; margin: 0;">Aura Interiors</h1>
            <p style="color: #666; margin: 5px 0 0 0;">AI-Powered Interior Design</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0 0 10px 0;">Password Reset Request</h2>
            <p style="color: #666; margin: 0 0 20px 0; line-height: 1.6;">
              Hi there! We received a request to reset your password for your Aura Interiors account. 
              Click the button below to reset your password.
            </p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; padding: 12px 30px; text-decoration: none; 
                        border-radius: 8px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">
              This link will expire in 10 minutes for security reasons.
            </p>
            <p style="margin: 0;">
              If you didn't request this password reset, you can safely ignore this email.
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">© 2024 Aura Interiors. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">
              <a href="#" style="color: #999; text-decoration: none;">Privacy Policy</a> | 
              <a href="#" style="color: #999; text-decoration: none;">Terms of Service</a>
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

export const sendVerificationEmail = async (email, verificationToken) => {
  try {
    const transporter = createTransporter();
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Aura Interiors <noreply@aurainteriors.com>',
      to: email,
      subject: 'Verify Your Email - Aura Interiors',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="color: white; font-size: 24px;">✨</span>
            </div>
            <h1 style="color: #333; margin: 0;">Aura Interiors</h1>
            <p style="color: #666; margin: 5px 0 0 0;">AI-Powered Interior Design</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0 0 10px 0;">Verify Your Email Address</h2>
            <p style="color: #666; margin: 0 0 20px 0; line-height: 1.6;">
              Welcome to Aura Interiors! Please verify your email address to complete your registration 
              and start using our AI-powered interior design services.
            </p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; padding: 12px 30px; text-decoration: none; 
                        border-radius: 8px; display: inline-block; font-weight: bold;">
                Verify Email
              </a>
            </div>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 14px;">
            <p style="margin: 0;">
              This link will expire in 24 hours for security reasons.
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">© 2024 Aura Interiors. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};
