const Job = require("../models/Job");
const Company = require("../models/Company");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");
const { getPaginationParams } = require("../utils/helpers");

exports.createJob = async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user._id });
    if (!company) return sendError(res, "Company not found.", 404);

    if (!company.isApproved) {
      return sendError(res, "Company must be approved before posting jobs.", 403);
    }

    if (!company.isSubscriptionValid()) {
      return sendError(res, "Active subscription required to post jobs.", 403);
    }

    if (company.currentPlan !== "yearly" && company.jobsUsed >= company.jobsAllowed) {
      return sendError(res, "Job posting limit reached. Please upgrade your plan.", 403);
    }

    const {
      title, description, skillsRequired, experienceRequired,
      salaryMin, salaryMax, openings, location, workMode, jobType, deadline,
    } = req.body;

    const job = await Job.create({
      title,
      description,
      companyId: company._id,
      postedBy: req.user._id,
      skillsRequired: skillsRequired || [],
      experienceRequired: experienceRequired || {},
      salaryMin,
      salaryMax,
      openings: openings || 1,
      location,
      workMode: workMode || "onsite",
      jobType: jobType || "full_time",
      deadline: deadline ? new Date(deadline) : null,
      status: "pending_approval",
    });

    company.jobsUsed += 1;
    await company.save();

    return sendSuccess(res, "Job posted successfully. Awaiting admin approval.", job, 201);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.updateJob = async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user._id });
    const job = await Job.findOne({ _id: req.params.id, companyId: company._id });
    if (!job) return sendError(res, "Job not found.", 404);

    if (!["pending_approval", "draft"].includes(job.status)) {
      return sendError(res, "Approved or closed jobs cannot be edited.", 400);
    }

    const allowedFields = [
      "title", "description", "skillsRequired", "experienceRequired",
      "salaryMin", "salaryMax", "openings", "location", "workMode", "jobType", "deadline",
    ];

    allowedFields.forEach((f) => { if (req.body[f] !== undefined) job[f] = req.body[f]; });
    job.status = "pending_approval";
    await job.save();

    return sendSuccess(res, "Job updated and resubmitted for approval.", job);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user._id });
    const job = await Job.findOneAndDelete({ _id: req.params.id, companyId: company._id });
    if (!job) return sendError(res, "Job not found.", 404);
    return sendSuccess(res, "Job deleted.");
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getCompanyJobs = async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user._id });
    if (!company) return sendError(res, "Company not found.", 404);

    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { companyId: company._id };
    if (req.query.status) filter.status = req.query.status;

    const [jobs, total] = await Promise.all([
      Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Job.countDocuments(filter),
    ]);

    return sendPaginated(res, "Jobs fetched.", jobs, total, page, limit);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.listJobs = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { status: "approved" };

    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }
    if (req.query.location) filter.location = new RegExp(req.query.location, "i");
    if (req.query.workMode) filter.workMode = req.query.workMode;
    if (req.query.jobType) filter.jobType = req.query.jobType;
    if (req.query.skills) {
      const skills = req.query.skills.split(",").map((s) => s.trim().toLowerCase());
      filter.skillsRequired = { $in: skills };
    }

    filter.deadline = { $gt: new Date() };

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate({ path: "companyId", select: "companyName logo city industry" })
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

exports.getJobDetails = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate({ path: "companyId", select: "companyName logo city state industry description website" });
    if (!job) return sendError(res, "Job not found.", 404);
    return sendSuccess(res, "Job details.", job);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.closeJob = async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user._id });
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, companyId: company._id },
      { status: "closed" },
      { new: true }
    );
    if (!job) return sendError(res, "Job not found.", 404);
    return sendSuccess(res, "Job closed.", job);
  } catch (err) {
    return sendError(res, err.message);
  }
};
