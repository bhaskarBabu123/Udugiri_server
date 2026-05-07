const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "otp",
        "application_submitted",
        "shortlisted",
        "selected",
        "rejected",
        "hired",
        "job_approved",
        "job_rejected",
        "company_approved",
        "company_rejected",
        "payment_success",
        "payment_failed",
        "subscription_expiring",
        "interview_scheduled",
        "profile_incomplete",
        "general",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    data: mongoose.Schema.Types.Mixed,
    link: String,
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
