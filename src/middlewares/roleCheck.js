const { sendError } = require("../utils/response");

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, "Authentication required.", 401);
    }
    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Required role: ${roles.join(" or ")}.`,
        403
      );
    }
    next();
  };
};

const requireApproved = (req, res, next) => {
  if (!req.user.isApproved) {
    return sendError(res, "Your account is pending approval.", 403);
  }
  next();
};

const requirePasswordCreated = (req, res, next) => {
  if (!req.user.isPasswordCreated) {
    return sendError(
      res,
      "Please complete your onboarding by creating a password first.",
      403
    );
  }
  next();
};

module.exports = { authorize, requireApproved, requirePasswordCreated };
