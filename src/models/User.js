const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "student", "company"],
      required: true,
      index: true,
    },
    isImported: { type: Boolean, default: false },
    isFirstLogin: { type: Boolean, default: true },
    isPasswordCreated: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    profileCompletion: { type: Number, default: 0, min: 0, max: 100 },
    otpVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
    refreshToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date },
    profileRef: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "profileModel",
    },
    profileModel: {
      type: String,
      enum: ["Student", "Company"],
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
