const mongoose = require("mongoose");

const jobMatchSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    matchScore: { type: Number, min: 0, max: 100, default: 0 },
    breakdown: {
      skillsScore: { type: Number, default: 0 },
      locationScore: { type: Number, default: 0 },
      experienceScore: { type: Number, default: 0 },
      educationScore: { type: Number, default: 0 },
    },
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

jobMatchSchema.index({ studentId: 1, matchScore: -1 });
jobMatchSchema.index({ jobId: 1, matchScore: -1 });
jobMatchSchema.index({ studentId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model("JobMatch", jobMatchSchema);
