const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    skillsRequired: [{ type: String, lowercase: true, trim: true }],
    experienceRequired: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 5 },
    },
    salaryMin: Number,
    salaryMax: Number,
    openings: { type: Number, default: 1, min: 1 },
    location: { type: String, trim: true, index: true },
    workMode: {
      type: String,
      enum: ["onsite", "remote", "hybrid"],
      default: "onsite",
    },
    jobType: {
      type: String,
      enum: ["full_time", "part_time", "internship", "contract", "freelance"],
      default: "full_time",
    },
    deadline: Date,
    status: {
      type: String,
      enum: ["pending_approval", "approved", "rejected", "closed", "draft"],
      default: "pending_approval",
      index: true,
    },
    rejectedReason: String,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    applicationCount: { type: Number, default: 0 },
    isImported: { type: Boolean, default: false },
  },
  { timestamps: true }
);

jobSchema.index({ skillsRequired: 1 });
jobSchema.index({ status: 1, deadline: 1 });
jobSchema.index({ companyId: 1, status: 1 });
jobSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Job", jobSchema);
