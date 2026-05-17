import nodemailer from 'nodemailer';

// Create a transporter (using Gmail for development)
const createTransporter = () => {
  return nodemailer.createTransport({
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
      from: process.env.EMAIL_FROM || 'HomiTify <noreply@homitify.com>',
      to: email,
      subject: 'Reset Your Password - HomiTify',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="color: white; font-size: 24px;">✨</span>
            </div>
            <h1 style="color: #333; margin: 0;">HomiTify</h1>
            <p style="color: #666; margin: 5px 0 0 0;">AI-Powered Interior Design</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0 0 10px 0;">Password Reset Request</h2>
            <p style="color: #666; margin: 0 0 20px 0; line-height: 1.6;">
              Hi there! We received a request to reset your password for your HomiTify account. 
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
            <p style="margin: 0;">© 2024 HomiTify. All rights reserved.</p>
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
      from: process.env.EMAIL_FROM || 'HomiTify <noreply@homitify.com>',
      to: email,
      subject: 'Verify Your Email - HomiTify',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="color: white; font-size: 24px;">✨</span>
            </div>
            <h1 style="color: #333; margin: 0;">HomiTify</h1>
            <p style="color: #666; margin: 5px 0 0 0;">AI-Powered Interior Design</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0 0 10px 0;">Verify Your Email Address</h2>
            <p style="color: #666; margin: 0 0 20px 0; line-height: 1.6;">
              Welcome to HomiTify! Please verify your email address to complete your registration 
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
            <p style="margin: 0;">© 2024 HomiTify. All rights reserved.</p>
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

export const sendDesignerApprovalEmail = async (email, designerName) => {
  try {
    const transporter = createTransporter();
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/designer`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'HomiTify <noreply@homitify.com>',
      to: email,
      subject: 'Your Designer Application Has Been Approved! - HomiTify',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="color: white; font-size: 24px;">✨</span>
            </div>
            <h1 style="color: #333; margin: 0;">HomiTify</h1>
            <p style="color: #666; margin: 5px 0 0 0;">AI-Powered Interior Design</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0 0 10px 0;">Congratulations, ${designerName || 'Designer'}!</h2>
            <p style="color: #666; margin: 0 0 20px 0; line-height: 1.6;">
              We are thrilled to inform you that your application to become a designer on HomiTify has been approved! 
              Welcome to our community of talented professionals. You can now access your designer dashboard and start showcasing your amazing work to clients.
            </p>
            
            <div style="text-align: center;">
              <a href="${dashboardUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; padding: 12px 30px; text-decoration: none; 
                        border-radius: 8px; display: inline-block; font-weight: bold;">
                Go to Your Dashboard
              </a>
            </div>
          </div>
          
          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">© 2024 HomiTify. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Designer approval email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending designer approval email:', error);
    throw new Error('Failed to send designer approval email');
  }
};

export const sendDesignerRejectionEmail = async (email, designerName, reason = "Your application did not meet our current criteria.") => {
  try {
    const transporter = createTransporter();
    const supportUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'HomiTify <noreply@homitify.com>',
      to: email,
      subject: 'Update on Your Designer Application - HomiTify',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="color: white; font-size: 24px;">&#x274C;</span>
            </div>
            <h1 style="color: #333; margin: 0;">HomiTify</h1>
            <p style="color: #666; margin: 5px 0 0 0;">AI-Powered Interior Design</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0 0 10px 0;">Dear ${designerName || 'Designer'},</h2>
            <p style="color: #666; margin: 0 0 15px 0; line-height: 1.6;">
              Thank you for your interest in joining HomiTify as a professional designer. 
              We have carefully reviewed your application.
            </p>
            <p style="color: #666; margin: 0 0 20px 0; line-height: 1.6;">
              Unfortunately, at this time, we are unable to approve your application. The reason provided was: 
              <strong>${reason}</strong>.
            </p>
            <p style="color: #666; margin: 0 0 15px 0; line-height: 1.6;">
              Your data has been saved for future review, and we may reach out if new opportunities arise or our criteria change.
            </p>
            <p style="color: #666; margin: 0 0 20px 0; line-height: 1.6;">
              If you have any questions or would like to provide additional information, please do not hesitate to contact our support team.
            </p>
            
            <div style="text-align: center;">
              <a href="${supportUrl}" 
                 style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
                        color: white; padding: 12px 30px; text-decoration: none; 
                        border-radius: 8px; display: inline-block; font-weight: bold;">
                Contact Support
              </a>
            </div>
          </div>
          
          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">© 2024 HomiTify. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Designer rejection email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending designer rejection email:', error);
    throw new Error('Failed to send designer rejection email');
  }
};

export const sendNewDesignerSignupEmail = async (designerEmail, designerName) => {
  try {
    const transporter = createTransporter();
    const adminDashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/users?role=designer&status=pending`; // Assuming an admin route to view pending designers
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'HomiTify <noreply@homitify.com>',
      to: process.env.ADMIN_EMAIL || 'admin@example.com', // Admin email address
      subject: 'New Designer Signup - Action Required - HomiTify',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="color: white; font-size: 24px;">&#x1F4E9;</span>
            </div>
            <h1 style="color: #333; margin: 0;">HomiTify</h1>
            <p style="color: #666; margin: 5px 0 0 0;">AI-Powered Interior Design</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0 0 10px 0;">New Designer Application Received!</h2>
            <p style="color: #666; margin: 0 0 15px 0; line-height: 1.6;">
              A new designer, <strong>${designerName || designerEmail}</strong>, has just signed up on HomiTify.
              Their application is awaiting your review and approval.
            </p>
            <p style="color: #666; margin: 0 0 20px 0; line-height: 1.6;">
              Please log in to the admin dashboard to review their profile and take appropriate action (approve or reject).
            </p>
            
            <div style="text-align: center;">
              <a href="${adminDashboardUrl}" 
                 style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                        color: white; padding: 12px 30px; text-decoration: none; 
                        border-radius: 8px; display: inline-block; font-weight: bold;">
                Review Pending Designers
              </a>
            </div>
          </div>
          
          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">© 2024 HomiTify. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('New designer signup notification email sent to admin:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending new designer signup notification email to admin:', error);
    throw new Error('Failed to send new designer signup notification email to admin');
  }
};
