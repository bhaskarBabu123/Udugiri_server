const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d" }
  );
};

const generateOTP = (length = 6) => {
  return Math.floor(100000 + Math.random() * 900000).toString().substring(0, length);
};

const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
};

const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildSortQuery = (sortBy, sortOrder) => {
  const order = sortOrder === "asc" ? 1 : -1;
  return { [sortBy || "createdAt"]: order };
};

const sanitizePhone = (phone) => {
  if (!phone) return null;
  return phone.replace(/[^0-9+]/g, "").trim();
};

const formatCurrency = (amount, currency = "INR") => {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateOTP,
  generateResetToken,
  getPaginationParams,
  buildSortQuery,
  sanitizePhone,
  formatCurrency,
};
