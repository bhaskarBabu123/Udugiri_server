const OTP = require("../models/OTP");
const { generateOTP } = require("../utils/helpers");
const { sendOTPEmail } = require("./emailService");

const sendOTP = async (email, purpose = "login", name = "User") => {
  await OTP.deleteMany({ email, purpose });

  const otp = generateOTP(6);

  await OTP.create({ email, otp, purpose });

  await sendOTPEmail(email, otp, name);

  console.log(`OTP for ${email} [${purpose}]: ${otp}`);

  return { success: true };
};

const verifyOTP = async (email, otp, purpose = "login") => {
  const record = await OTP.findOne({
    email: email.toLowerCase(),
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    return { valid: false, reason: "OTP has expired or does not exist." };
  }

  record.attempts += 1;

  if (record.attempts > 5) {
    await record.deleteOne();
    return { valid: false, reason: "Too many incorrect attempts. Please request a new OTP." };
  }

  if (record.otp !== otp) {
    await record.save();
    return { valid: false, reason: "Incorrect OTP." };
  }

  record.isUsed = true;
  await record.save();

  return { valid: true };
};

module.exports = { sendOTP, verifyOTP };
