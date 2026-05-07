const Student = require("../models/Student");
const User = require("../models/User");
const Application = require("../models/Application");
const Job = require("../models/Job");
const Notification = require("../models/Notification");
const { getRecommendedJobsForStudent } = require("../services/matchingEngine");
const { notifyApplicationSubmitted } = require("../services/notificationService");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");
const { getPaginationParams, buildSortQuery } = require("../utils/helpers");

exports.getProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return sendError(res, "Student profile not found.", 404);
    return sendSuccess(res, "Profile fetched.", student);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      "fullName", "phone", "alternatePhone", "dob", "gender", "address",
      "city", "state", "country", "pincode", "linkedin", "github", "portfolio",
      "education", "skills", "projects", "certifications", "internships",
      "experienceYears", "expectedSalary", "preferredLocations", "noticePeriod",
    ];

    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return sendError(res, "Student not found.", 404);

    Object.assign(student, updates);
    student.calculateProfileCompletion();
    await student.save();

    await User.findByIdAndUpdate(req.user._id, {
      profileCompletion: student.profileCompletion,
    });

    return sendSuccess(res, "Profile updated.", student);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) return sendError(res, "Resume file required.", 400);
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return sendError(res, "Student not found.", 404);
    student.resume = req.file.path;
    student.calculateProfileCompletion();
    await student.save();
    return sendSuccess(res, "Resume uploaded.", { resume: student.resume, profileCompletion: student.profileCompletion });
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) return sendError(res, "Photo file required.", 400);
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return sendError(res, "Student not found.", 404);
    student.photo = req.file.path;
    await student.save();
    return sendSuccess(res, "Photo uploaded.", { photo: student.photo });
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return sendError(res, "Student not found.", 404);

    const [totalApplications, shortlisted, interviews, hired] = await Promise.all([
      Application.countDocuments({ studentId: student._id }),
      Application.countDocuments({ studentId: student._id, status: "shortlisted" }),
      Application.countDocuments({ studentId: student._id, status: "interview_scheduled" }),
      Application.countDocuments({ studentId: student._id, status: "hired" }),
    ]);

    const recentApplications = await Application.find({ studentId: student._id })
      .populate({ path: "jobId", select: "title location workMode" })
      .populate({ path: "companyId", select: "companyName logo" })
      .sort({ createdAt: -1 })
      .limit(5);

    return sendSuccess(res, "Dashboard data.", {
      profileCompletion: student.profileCompletion,
      totalApplications,
      shortlisted,
      interviews,
      hired,
      recentApplications,
      canApply: student.profileCompletion >= 60 && !!student.resume,
      placementStatus: student.placementStatus,
    });
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getRecommendedJobs = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return sendError(res, "Student not found.", 404);
    const jobs = await getRecommendedJobsForStudent(student._id, parseInt(req.query.limit) || 10);
    return sendSuccess(res, "Recommended jobs.", jobs);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.applyJob = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return sendError(res, "Student not found.", 404);

    if (student.profileCompletion < 60) {
      return sendError(res, "Profile completion must be at least 60% to apply.", 400);
    }
    if (!student.resume) {
      return sendError(res, "Please upload your resume before applying.", 400);
    }

    const job = await Job.findById(req.params.jobId).populate("companyId");
    if (!job || job.status !== "approved") {
      return sendError(res, "Job not found or not accepting applications.", 404);
    }

    if (job.deadline && new Date() > job.deadline) {
      return sendError(res, "Application deadline has passed.", 400);
    }

    const exists = await Application.findOne({ studentId: student._id, jobId: job._id });
    if (exists) return sendError(res, "You have already applied for this job.", 400);

    const application = await Application.create({
      studentId: student._id,
      companyId: job.companyId,
      jobId: job._id,
      userId: req.user._id,
      coverLetter: req.body.coverLetter,
      statusHistory: [{ status: "applied", changedAt: new Date(), note: "Application submitted" }],
    });

    await Job.findByIdAndUpdate(job._id, { $inc: { applicationCount: 1 } });
    await notifyApplicationSubmitted(req.user._id, job.title);

    return sendSuccess(res, "Application submitted successfully.", application, 201);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getApplications = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return sendError(res, "Student not found.", 404);
    const { page, limit, skip } = getPaginationParams(req.query);

    const [applications, total] = await Promise.all([
      Application.find({ studentId: student._id })
        .populate({ path: "jobId", select: "title location workMode jobType salaryMin salaryMax" })
        .populate({ path: "companyId", select: "companyName logo city" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Application.countDocuments({ studentId: student._id }),
    ]);

    return sendPaginated(res, "Applications fetched.", applications, total, page, limit);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getSavedJobs = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id }).populate({
      path: "savedJobs",
      populate: { path: "companyId", select: "companyName logo" },
    });
    if (!student) return sendError(res, "Student not found.", 404);
    return sendSuccess(res, "Saved jobs.", student.savedJobs);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.toggleSaveJob = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return sendError(res, "Student not found.", 404);

    const jobId = req.params.jobId;
    const idx = student.savedJobs.indexOf(jobId);
    let saved;
    if (idx === -1) {
      student.savedJobs.push(jobId);
      saved = true;
    } else {
      student.savedJobs.splice(idx, 1);
      saved = false;
    }
    await student.save();
    return sendSuccess(res, saved ? "Job saved." : "Job removed from saved.", { saved });
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const [notifications, total] = await Promise.all([
      Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments({ userId: req.user._id }),
    ]);
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    return sendPaginated(res, "Notifications fetched.", notifications, total, page, limit);
  } catch (err) {
    return sendError(res, err.message);
  }
};
