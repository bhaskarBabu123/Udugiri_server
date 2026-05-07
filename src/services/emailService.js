const nodemailer = require("nodemailer");

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const t = getTransporter();
    const info = await t.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || "Udugiri Careers"}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send failed:", error.message);
    return { success: false, error: error.message };
  }
};

const sendOTPEmail = async (email, otp, name = "User") => {
  return sendEmail({
    to: email,
    subject: "Your OTP - careers.udugiri.com",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#1d4ed8;margin-bottom:8px;">Udugiri Careers</h2>
        <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;">Your OTP for login is:</p>
        <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1d4ed8;">${otp}</span>
        </div>
        <p style="color:#6b7280;font-size:14px;">This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="color:#6b7280;font-size:12px;margin-top:32px;">© 2024 careers.udugiri.com</p>
      </div>
    `,
    text: `Your OTP is: ${otp}. It expires in 10 minutes.`,
  });
};

const sendWelcomeEmail = async (email, name, role) => {
  return sendEmail({
    to: email,
    subject: "Welcome to careers.udugiri.com!",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1d4ed8;">Welcome, ${name}!</h2>
        <p>Your account as a <strong>${role}</strong> has been created on Udugiri Careers.</p>
        <p>You can now log in and complete your profile to get started.</p>
        <a href="${process.env.FRONTEND_URL || "#"}/login" 
           style="display:inline-block;background:#1d4ed8;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px;">
          Login Now
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:32px;">© 2024 careers.udugiri.com</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (email, name, resetUrl) => {
  return sendEmail({
    to: email,
    subject: "Reset Your Password - careers.udugiri.com",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1d4ed8;">Password Reset</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" 
           style="display:inline-block;background:#dc2626;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px;">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:14px;margin-top:16px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
    text: `Reset your password at: ${resetUrl}`,
  });
};

const sendApplicationStatusEmail = async (email, name, jobTitle, status) => {
  const statusMap = {
    shortlisted: { label: "Shortlisted", color: "#16a34a" },
    rejected: { label: "Not Selected", color: "#dc2626" },
    interview_scheduled: { label: "Interview Scheduled", color: "#d97706" },
    selected: { label: "Selected", color: "#16a34a" },
    hired: { label: "Hired!", color: "#7c3aed" },
  };
  const info = statusMap[status] || { label: status, color: "#374151" };

  return sendEmail({
    to: email,
    subject: `Application Update: ${info.label} - ${jobTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1d4ed8;">Application Update</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your application for <strong>${jobTitle}</strong> has been updated:</p>
        <p style="font-size:24px;font-weight:bold;color:${info.color};">${info.label}</p>
        <p><a href="${process.env.FRONTEND_URL || "#"}/student/applications">View your applications</a></p>
      </div>
    `,
  });
};

const sendCompanyApprovalEmail = async (email, companyName, approved, reason) => {
  return sendEmail({
    to: email,
    subject: approved ? "Company Approved - careers.udugiri.com" : "Company Registration Update",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1d4ed8;">Company Registration Update</h2>
        <p>Dear <strong>${companyName}</strong>,</p>
        ${approved
          ? `<p style="color:#16a34a;font-weight:bold;">Your company has been approved!</p>
             <p>You can now purchase a subscription and start posting jobs.</p>
             <a href="${process.env.FRONTEND_URL || "#"}/company/subscription" 
                style="display:inline-block;background:#1d4ed8;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">
               View Plans
             </a>`
          : `<p style="color:#dc2626;font-weight:bold;">Your company registration was not approved.</p>
             <p><strong>Reason:</strong> ${reason || "Please contact support for more information."}</p>`
        }
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendApplicationStatusEmail,
  sendCompanyApprovalEmail,
};
