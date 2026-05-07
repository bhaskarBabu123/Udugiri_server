const crypto = require("crypto");
const User = require("../models/User");
const Student = require("../models/Student");
const Company = require("../models/Company");
const { sendOTP, verifyOTP } = require("../services/otpService");
const { sendPasswordResetEmail } = require("../services/emailService");
const {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
} = require("../utils/helpers");
const { sendSuccess, sendError } = require("../utils/response");
const jwt = require("jsonwebtoken");

exports.sendLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return sendError(res, "No account found with this email.", 404);
    }
    if (!user.isActive) {
      return sendError(res, "Your account is deactivated. Please contact support.", 403);
    }

    let name = email;
    if (user.profileRef) {
      const Profile = user.role === "student" ? Student : Company;
      const profile = await Profile.findById(user.profileRef);
      name = profile ? (profile.fullName || profile.companyName || email) : email;
    }

    await sendOTP(email, "login", name);
    return sendSuccess(res, "OTP sent to your email.", {
      email,
      isFirstLogin: user.isFirstLogin,
      isPasswordCreated: user.isPasswordCreated,
    });
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyOTP(email, otp, "login");
    if (!result.valid) {
      return sendError(res, result.reason, 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return sendError(res, "User not found.", 404);

    user.otpVerified = true;
    user.lastLogin = new Date();
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    return sendSuccess(res, "OTP verified successfully.", {
      accessToken,
      refreshToken,
      user: user.toSafeObject(),
      isFirstLogin: user.isFirstLogin,
      isPasswordCreated: user.isPasswordCreated,
      requiresOnboarding: user.isFirstLogin || !user.isPasswordCreated,
    });
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.loginWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user || !user.isPasswordCreated) {
      return sendError(res, "Invalid credentials or account not set up.", 401);
    }

    if (!user.isActive) {
      return sendError(res, "Your account is deactivated.", 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, "Invalid email or password.", 401);
    }

    user.lastLogin = new Date();
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    const accessToken = generateAccessToken(user);

    return sendSuccess(res, "Logged in successfully.", {
      accessToken,
      refreshToken,
      user: user.toSafeObject(),
    });
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.createPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id);

    user.password = password;
    user.isPasswordCreated = true;
    user.isFirstLogin = false;
    await user.save();

    return sendSuccess(res, "Password created successfully. You can now login with your password.");
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return sendSuccess(res, "If this email exists, a reset link has been sent.");
    }

    const { token, hash } = generateResetToken();
    user.passwordResetToken = hash;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/${token}`;

    let name = email;
    if (user.profileRef) {
      const Profile = user.role === "student" ? Student : Company;
      const profile = await Profile.findById(user.profileRef);
      name = profile ? (profile.fullName || profile.companyName) : email;
    }

    await sendPasswordResetEmail(email, name, resetUrl);

    return sendSuccess(res, "Password reset link sent to your email.");
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const hash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hash,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return sendError(res, "Invalid or expired reset token.", 400);
    }

    user.password = password;
    user.isPasswordCreated = true;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return sendSuccess(res, "Password reset successfully. Please login.");
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return sendError(res, "Refresh token required.", 400);

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== refreshToken) {
      return sendError(res, "Invalid refresh token.", 401);
    }

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    user.refreshToken = newRefreshToken;
    await user.save();

    return sendSuccess(res, "Token refreshed.", { accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    if (err.name === "TokenExpiredError") return sendError(res, "Refresh token expired. Please login again.", 401);
    return sendError(res, "Invalid refresh token.", 401);
  }
};

exports.logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    return sendSuccess(res, "Logged out successfully.");
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("profileRef");
    return sendSuccess(res, "Profile fetched.", user.toSafeObject());
  } catch (err) {
    return sendError(res, err.message);
  }
};
