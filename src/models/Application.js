const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema({
  scheduledAt: Date,
  mode: { type: String, enum: ["online", "offline", "phone"] },
  location: String,
  meetingLink: String,
  notes: String,
  interviewerName: String,
  round: { type: Number, default: 1 },
});

const applicationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "applied",
        "under_review",
        "shortlisted",
        "rejected",
        "interview_scheduled",
        "selected",
        "hired",
        "joined",
      ],
      default: "applied",
      index: true,
    },
    notes: String,
    companyNotes: String,
    coverLetter: String,
    interviewDetails: interviewSchema,
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: String,
      },
    ],
    hiredAt: Date,
    joinedAt: Date,
  },
  { timestamps: true }
);

applicationSchema.index({ studentId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model("Application", applicationSchema);
