const User = require("../models/User");
const Student = require("../models/Student");
const Company = require("../models/Company");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Payment = require("../models/Payment");
const Subscription = require("../models/Subscription");
const Notification = require("../models/Notification");
const { importStudents, importCompanies, importJobs } = require("../services/importService");
const {
  notifyCompanyApproval,
  notifyJobApproval,
  createNotification,
} = require("../services/notificationService");
const {
  sendCompanyApprovalEmail,
} = require("../services/emailService");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");
const { getPaginationParams } = require("../utils/helpers");

exports.getDashboard = async (req, res) => {
  try {
    const [
      totalStudents, totalCompanies, totalJobs, totalApplications,
      pendingCompanies, pendingJobs, totalPlacements, totalRevenue,
      recentPayments,
    ] = await Promise.all([
      Student.countDocuments(),
      Company.countDocuments({ isApproved: true }),
      Job.countDocuments({ status: "approved" }),
      Application.countDocuments(),
      Company.countDocuments({ approvalStatus: "pending" }),
      Job.countDocuments({ status: "pending_approval" }),
      Student.countDocuments({ isPlaced: true }),
      Payment.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.find({ status: "paid" }).sort({ createdAt: -1 }).limit(5).populate("companyId", "companyName"),
    ]);

    return sendSuccess(res, "Admin dashboard.", {
      stats: {
        totalStudents,
        totalCompanies,
        totalJobs,
        totalApplications,
        pendingCompanies,
        pendingJobs,
        totalPlacements,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
      recentPayments,
    });
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.bulkImportStudents = async (req, res) => {
  try {
    if (!req.file) return sendError(res, "Import file required.", 400);
    const results = await importStudents(req.file.path, req.user._id);
    return sendSuccess(res, "Students import completed.", results);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.bulkImportCompanies = async (req, res) => {
  try {
    if (!req.file) return sendError(res, "Import file required.", 400);
    const results = await importCompanies(req.file.path, req.user._id);
    return sendSuccess(res, "Companies import completed.", results);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.bulkImportJobs = async (req, res) => {
  try {
    if (!req.file) return sendError(res, "Import file required.", 400);
    const results = await importJobs(req.file.path, req.user._id);
    return sendSuccess(res, "Jobs import completed.", results);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.approveCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).populate("userId");
    if (!company) return sendError(res, "Company not found.", 404);

    company.isApproved = true;
    company.approvalStatus = "approved";
    company.approvedBy = req.user._id;
    company.approvedAt = new Date();
    await company.save();

    await User.findByIdAndUpdate(company.userId._id, { isApproved: true });
    await notifyCompanyApproval(company.userId._id, company.companyName, true);
    await sendCompanyApprovalEmail(company.email, company.companyName, true);

    return sendSuccess(res, "Company approved.");
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.rejectCompany = async (req, res) => {
  try {
    const { reason } = req.body;
    const company = await Company.findById(req.params.id).populate("userId");
    if (!company) return sendError(res, "Company not found.", 404);

    company.approvalStatus = "rejected";
    company.rejectedReason = reason;
    company.isApproved = false;
    await company.save();

    await notifyCompanyApproval(company.userId._id, company.companyName, false, reason);
    await sendCompanyApprovalEmail(company.email, company.companyName, false, reason);

    return sendSuccess(res, "Company rejected.");
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.approveJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("postedBy companyId");
    if (!job) return sendError(res, "Job not found.", 404);

    job.status = "approved";
    job.approvedBy = req.user._id;
    job.approvedAt = new Date();
    await job.save();

    await notifyJobApproval(job.postedBy._id, job.title, true);
    return sendSuccess(res, "Job approved.", job);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.rejectJob = async (req, res) => {
  try {
    const { reason } = req.body;
    const job = await Job.findById(req.params.id).populate("postedBy");
    if (!job) return sendError(res, "Job not found.", 404);

    job.status = "rejected";
    job.rejectedReason = reason;
    await job.save();

    await notifyJobApproval(job.postedBy._id, job.title, false, reason);
    return sendSuccess(res, "Job rejected.", job);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.listUsers = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    return sendPaginated(res, "Users fetched.", users, total, page, limit);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.listStudents = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = {};
    if (req.query.isPlaced !== undefined) filter.isPlaced = req.query.isPlaced === "true";
    if (req.query.city) filter.city = new RegExp(req.query.city, "i");

    const [students, total] = await Promise.all([
      Student.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Student.countDocuments(filter),
    ]);
    return sendPaginated(res, "Students fetched.", students, total, page, limit);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.listCompanies = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = {};
    if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;

    const [companies, total] = await Promise.all([
      Company.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Company.countDocuments(filter),
    ]);
    return sendPaginated(res, "Companies fetched.", companies, total, page, limit);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.listJobs = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate({ path: "companyId", select: "companyName" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(filter),
    ]);
    return sendPaginated(res, "Jobs fetched.", jobs, total, page, limit);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getPaymentReports = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [payments, total, summary] = await Promise.all([
      Payment.find(filter)
        .populate("companyId", "companyName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
      Payment.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: "$planType", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
    ]);

    return sendPaginated(res, "Payment reports.", { payments, summary }, total, page, limit);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, "User not found.", 404);
    user.isActive = !user.isActive;
    await user.save();
    return sendSuccess(res, `User ${user.isActive ? "activated" : "deactivated"}.`, { isActive: user.isActive });
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.sendBroadcast = async (req, res) => {
  try {
    const { title, message, role } = req.body;
    const userFilter = role ? { role } : {};
    const users = await User.find(userFilter, "_id");

    const notifications = users.map((u) => ({
      userId: u._id,
      type: "general",
      title,
      message,
    }));

    await Notification.insertMany(notifications);
    return sendSuccess(res, `Broadcast sent to ${notifications.length} users.`);
  } catch (err) {
    return sendError(res, err.message);
  }
};
