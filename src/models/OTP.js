const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["login", "forgot_password", "email_verify", "phone_verify"],
      default: "login",
    },
    attempts: { type: Number, default: 0 },
    isUsed: { type: Boolean, default: false },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OTP", otpSchema);
