const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    companyName: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    hrName: { type: String, trim: true },
    website: String,
    logo: String,
    industry: String,
    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
    },
    foundedYear: Number,
    gstNumber: String,
    panNumber: String,
    address: String,
    city: String,
    state: String,
    country: { type: String, default: "India" },
    description: String,

    isApproved: { type: Boolean, default: false, index: true },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    rejectedReason: String,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,

    currentPlan: {
      type: String,
      enum: ["none", "one_time", "monthly", "yearly"],
      default: "none",
    },
    subscriptionStart: Date,
    subscriptionEnd: Date,
    subscriptionActive: { type: Boolean, default: false },
    hireQuota: { type: Number, default: 0 },
    hiresUsed: { type: Number, default: 0 },
    candidateUnlockCredits: { type: Number, default: 0 },
    unlocksUsed: { type: Number, default: 0 },
    jobsAllowed: { type: Number, default: 0 },
    jobsUsed: { type: Number, default: 0 },

    unlockedCandidates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
    isImported: { type: Boolean, default: false },
  },
  { timestamps: true }
);

companySchema.virtual("remainingHires").get(function () {
  return Math.max(0, this.hireQuota - this.hiresUsed);
});

companySchema.virtual("remainingUnlocks").get(function () {
  return Math.max(0, this.candidateUnlockCredits - this.unlocksUsed);
});

companySchema.virtual("remainingJobs").get(function () {
  if (this.currentPlan === "yearly") return Infinity;
  return Math.max(0, this.jobsAllowed - this.jobsUsed);
});

companySchema.methods.isSubscriptionValid = function () {
  if (!this.subscriptionActive) return false;
  if (this.subscriptionEnd && new Date() > this.subscriptionEnd) return false;
  return true;
};

module.exports = mongoose.model("Company", companySchema);
