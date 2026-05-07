const mongoose = require("mongoose");

const PLANS = {
  one_time: {
    price: 4999,
    validityDays: 365,
    jobsAllowed: 1,
    hiresAllowed: 1,
    unlockCredits: 20,
    label: "One Time Hire",
  },
  monthly: {
    price: 9999,
    validityDays: 30,
    jobsAllowed: 10,
    hiresAllowed: 10,
    unlockCredits: 100,
    label: "Monthly",
  },
  yearly: {
    price: 79999,
    validityDays: 365,
    jobsAllowed: -1,
    hiresAllowed: -1,
    unlockCredits: -1,
    label: "Yearly (Unlimited)",
  },
};

const subscriptionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    planType: {
      type: String,
      enum: ["one_time", "monthly", "yearly"],
      required: true,
    },
    price: { type: Number, required: true },
    validityDays: Number,
    jobsAllowed: Number,
    hiresAllowed: Number,
    unlockCredits: Number,
    jobsUsed: { type: Number, default: 0 },
    hiresUsed: { type: Number, default: 0 },
    unlocksUsed: { type: Number, default: 0 },
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    isActive: { type: Boolean, default: false },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    invoiceUrl: String,
    renewedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
  },
  { timestamps: true }
);

subscriptionSchema.methods.activate = function () {
  this.isActive = true;
  this.startDate = new Date();
  this.endDate = new Date(Date.now() + this.validityDays * 24 * 60 * 60 * 1000);
  this.paymentStatus = "paid";
};

subscriptionSchema.methods.isExpired = function () {
  if (!this.endDate) return false;
  return new Date() > this.endDate;
};

subscriptionSchema.statics.PLANS = PLANS;

module.exports = mongoose.model("Subscription", subscriptionSchema);
