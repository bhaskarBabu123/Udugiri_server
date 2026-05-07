const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendError } = require("../utils/response");

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return sendError(res, "Access denied. No token provided.", 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password -refreshToken");

    if (!user) {
      return sendError(res, "User not found or token invalid.", 401);
    }

    if (!user.isActive) {
      return sendError(res, "Your account has been deactivated.", 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return sendError(res, "Invalid token.", 401);
    }
    if (error.name === "TokenExpiredError") {
      return sendError(res, "Token has expired.", 401);
    }
    return sendError(res, "Authentication failed.", 500);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password -refreshToken");
    }
    next();
  } catch {
    next();
  }
};

module.exports = { protect, optionalAuth };
