const Company = require("../models/Company");
const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Student = require("../models/Student");
const { sendOTP, verifyOTP } = require("../services/otpService");
const { notifyApplicationStatus } = require("../services/notificationService");
const { sendApplicationStatusEmail } = require("../services/emailService");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");
const { getPaginationParams } = require("../utils/helpers");

exports.register = async (req, res) => {
  try {
    const { email, companyName, phone, hrName, website, industry } = req.body;
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return sendError(res, "Email already registered.", 400);

    const user = await User.create({
      email: email.toLowerCase(),
      role: "company",
      isFirstLogin: true,
      isPasswordCreated: false,
      isApproved: false,
    });

    const company = await Company.create({
      userId: user._id,
      companyName,
      email: email.toLowerCase(),
      phone,
      hrName,
      website,
      industry,
    });

    await User.findByIdAndUpdate(user._id, { profileRef: company._id, profileModel: "Company" });

    await sendOTP(email, "login", companyName);

    return sendSuccess(res, "Company registered. Please verify your email with the OTP sent.", {
      userId: user._id,
      email,
    }, 201);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getProfile = async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user._id });
    if (!company) return sendError(res, "Company not found.", 404);
    return sendSuccess(res, "Profile fetched.", company);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      "companyName", "phone", "hrName", "website", "industry", "companySize",
      "foundedYear", "gstNumber", "panNumber", "address", "city", "state",
      "country", "description",
    ];

    const updates = {};
    allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const company = await Company.findOneAndUpdate({ userId: req.user._id }, updates, {
      new: true,
      runValidators: true,
    });
    if (!company) return sendError(res, "Company not found.", 404);
    return sendSuccess(res, "Profile updated.", company);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) return sendError(res, "Logo file required.", 400);
    const company = await Company.findOneAndUpdate(
      { userId: req.user._id },
      { logo: req.file.path },
      { new: true }
    );
    return sendSuccess(res, "Logo uploaded.", { logo: company.logo });
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user._id });
    if (!company) return sendError(res, "Company not found.", 404);

    const [activeJobs, totalApplications, shortlisted, hired] = await Promise.all([
      Job.countDocuments({ companyId: company._id, status: "approved" }),
      Application.countDocuments({ companyId: company._id }),
      Application.countDocuments({ companyId: company._id, status: "shortlisted" }),
      Application.countDocuments({ companyId: company._id, status: "hired" }),
    ]);

    const recentApplications = await Application.find({ companyId: company._id })
      .populate({ path: "studentId", select: "fullName skills profileCompletion" })
      .populate({ path: "jobId", select: "title" })
      .sort({ createdAt: -1 })
      .limit(5);

    return sendSuccess(res, "Dashboard data.", {
      company: {
        name: company.companyName,
        approvalStatus: company.approvalStatus,
        isApproved: company.isApproved,
        subscriptionActive: company.isSubscriptionValid(),
        currentPlan: company.currentPlan,
        subscriptionEnd: company.subscriptionEnd,
        remainingHires: company.remainingHires,
        remainingUnlocks: company.remainingUnlocks,
        remainingJobs: company.currentPlan === "yearly" ? "Unlimited" : company.remainingJobs,
      },
      stats: { activeJobs, totalApplications, shortlisted, hired },
      recentApplications,
    });
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getApplicants = async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user._id });
    if (!company) return sendError(res, "Company not found.", 404);

    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { companyId: company._id };
    if (req.query.jobId) filter.jobId = req.query.jobId;
    if (req.query.status) filter.status = req.query.status;

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate({ path: "studentId", select: "fullName skills profileCompletion photo" })
        .populate({ path: "jobId", select: "title" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Application.countDocuments(filter),
    ]);

    const enriched = applications.map((app) => {
      const appObj = app.toObject();
      const isUnlocked =
        app.status !== "applied" ||
        company.unlockedCandidates.includes(app.studentId?._id?.toString());

      if (!isUnlocked && appObj.studentId) {
        appObj.studentId = {
          _id: appObj.studentId._id,
          skills: appObj.studentId.skills,
          profileCompletion: appObj.studentId.profileCompletion,
          fullName: appObj.studentId.fullName?.split(" ")[0] + " ***",
        };
      }
      return { ...appObj, isUnlocked };
    });

    return sendPaginated(res, "Applicants fetched.", enriched, total, page, limit);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const company = await Company.findOne({ userId: req.user._id });
    if (!company) return sendError(res, "Company not found.", 404);

    const application = await Application.findOne({
      _id: req.params.applicationId,
      companyId: company._id,
    }).populate("studentId").populate("jobId");

    if (!application) return sendError(res, "Application not found.", 404);

    if (status === "hired") {
      if (!company.isSubscriptionValid()) {
        return sendError(res, "Active subscription required to hire candidates.", 403);
      }
      if (company.remainingHires <= 0) {
        return sendError(res, "Hire quota exhausted. Please upgrade your plan.", 403);
      }
      company.hiresUsed += 1;
      application.hiredAt = new Date();
      await company.save();

      await Student.findByIdAndUpdate(application.studentId._id, {
        isPlaced: true,
        placementStatus: "placed",
        placementCompany: company._id,
        placementDate: new Date(),
      });
    }

    application.status = status;
    if (notes) application.companyNotes = notes;
    application.statusHistory.push({ status, changedAt: new Date(), changedBy: req.user._id, note: notes });
    await application.save();

    const studentUser = await User.findById(application.userId);
    if (studentUser) {
      await notifyApplicationStatus(studentUser._id, application.jobId.title, status);
      await sendApplicationStatusEmail(studentUser.email, application.studentId.fullName, application.jobId.title, status);
    }

    return sendSuccess(res, "Application status updated.", application);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.scheduleInterview = async (req, res) => {
  try {
    const { scheduledAt, mode, location, meetingLink, notes, interviewerName, round } = req.body;
    const company = await Company.findOne({ userId: req.user._id });

    const application = await Application.findOne({
      _id: req.params.applicationId,
      companyId: company._id,
    }).populate("jobId").populate("studentId");

    if (!application) return sendError(res, "Application not found.", 404);

    application.status = "interview_scheduled";
    application.interviewDetails = { scheduledAt, mode, location, meetingLink, notes, interviewerName, round: round || 1 };
    application.statusHistory.push({ status: "interview_scheduled", changedAt: new Date(), changedBy: req.user._id });
    await application.save();

    const studentUser = await User.findById(application.userId);
    if (studentUser) {
      await notifyApplicationStatus(studentUser._id, application.jobId.title, "interview_scheduled");
    }

    return sendSuccess(res, "Interview scheduled.", application);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.unlockCandidate = async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user._id });
    if (!company) return sendError(res, "Company not found.", 404);

    if (!company.isSubscriptionValid()) {
      return sendError(res, "Active subscription required to unlock candidates.", 403);
    }

    const studentId = req.params.studentId;
    if (company.unlockedCandidates.includes(studentId)) {
      const student = await Student.findById(studentId);
      return sendSuccess(res, "Candidate already unlocked.", student);
    }

    if (company.remainingUnlocks <= 0) {
      return sendError(res, "No unlock credits remaining. Please upgrade your plan.", 403);
    }

    company.unlocksUsed += 1;
    company.unlockedCandidates.push(studentId);
    await company.save();

    const student = await Student.findById(studentId);
    return sendSuccess(res, "Candidate profile unlocked.", student);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getBillingHistory = async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user._id });
    if (!company) return sendError(res, "Company not found.", 404);

    const Payment = require("../models/Payment");
    const payments = await Payment.find({ companyId: company._id }).sort({ createdAt: -1 });
    return sendSuccess(res, "Billing history.", payments);
  } catch (err) {
    return sendError(res, err.message);
  }
};
