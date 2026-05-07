const rateLimit = require("express-rate-limit");

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
  });

const generalLimiter = createLimiter(
  15 * 60 * 1000,
  200,
  "Too many requests from this IP. Please try again after 15 minutes."
);

const authLimiter = createLimiter(
  15 * 60 * 1000,
  20,
  "Too many auth attempts. Please try again after 15 minutes."
);

const otpLimiter = createLimiter(
  5 * 60 * 1000,
  5,
  "Too many OTP requests. Please wait 5 minutes."
);

const importLimiter = createLimiter(
  60 * 60 * 1000,
  10,
  "Too many import requests. Please wait an hour."
);

module.exports = { generalLimiter, authLimiter, otpLimiter, importLimiter };
