import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends a premium-styled OTP email to the user.
 * @param {string} to - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} name - User's name
 */
export const sendOtpEmail = async (to, otp, name) => {
  const mailOptions = {
    from: `"CampusConnect" <${process.env.EMAIL_USER}>`,
    to,
    subject: `🔐 Verify your CampusConnect Account`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; background-color: #f8fafc;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 24px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4f46e5; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">CampusConnect</h1>
            <p style="color: #64748b; margin-top: 8px; font-size: 16px;">One Platform for Every College Club</p>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 30px;">
            <p style="font-size: 18px; line-height: 1.6; margin-bottom: 24px;">Hi <strong>${name}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 32px;">
              Welcome to the community! To complete your registration and keep your account secure, please use the verification code below. This code will expire in <strong>10 minutes</strong>.
            </p>
            
            <div style="background-color: #f1f5f9; padding: 24px; border-radius: 16px; text-align: center; margin-bottom: 32px;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 800; letter-spacing: 8px; color: #1e293b;">${otp}</span>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; text-align: center;">
              If you didn't attempt to create an account with CampusConnect, you can safely ignore this email.
            </p>
          </div>
          
          <div style="margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <p style="font-size: 12px; color: #94a3b8;">
              © 2026 CampusConnect. Built for campus life.
            </p>
          </div>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
