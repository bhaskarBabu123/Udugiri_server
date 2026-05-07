const Notification = require("../models/Notification");

const createNotification = async ({ userId, type, title, message, data = null, link = null }) => {
  try {
    return await Notification.create({ userId, type, title, message, data, link });
  } catch (err) {
    console.error("Notification create failed:", err.message);
  }
};

const notifyApplicationSubmitted = (userId, jobTitle) =>
  createNotification({
    userId,
    type: "application_submitted",
    title: "Application Submitted",
    message: `You have successfully applied for "${jobTitle}".`,
    link: "/student/applications",
  });

const notifyApplicationStatus = (userId, jobTitle, status) =>
  createNotification({
    userId,
    type: status,
    title: `Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `Your application for "${jobTitle}" has been ${status}.`,
    link: "/student/applications",
  });

const notifyCompanyApproval = (userId, companyName, approved) =>
  createNotification({
    userId,
    type: approved ? "company_approved" : "company_rejected",
    title: approved ? "Company Approved" : "Company Not Approved",
    message: approved
      ? `${companyName} has been approved. You can now post jobs.`
      : `${companyName} was not approved. Please contact support.`,
    link: approved ? "/company/subscription" : null,
  });

const notifyJobApproval = (userId, jobTitle, approved, reason) =>
  createNotification({
    userId,
    type: approved ? "job_approved" : "job_rejected",
    title: approved ? "Job Approved" : "Job Not Approved",
    message: approved
      ? `Your job "${jobTitle}" has been approved and is now live.`
      : `Your job "${jobTitle}" was not approved. Reason: ${reason}`,
    link: "/company/jobs",
  });

const notifyPaymentSuccess = (userId, plan, amount) =>
  createNotification({
    userId,
    type: "payment_success",
    title: "Payment Successful",
    message: `Your ${plan} subscription has been activated. Amount paid: ₹${amount / 100}.`,
    link: "/company/billing",
  });

module.exports = {
  createNotification,
  notifyApplicationSubmitted,
  notifyApplicationStatus,
  notifyCompanyApproval,
  notifyJobApproval,
  notifyPaymentSuccess,
};
