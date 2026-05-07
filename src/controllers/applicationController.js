const Application = require("../models/Application");
const Student = require("../models/Student");
const Job = require("../models/Job");
const Company = require("../models/Company");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");
const { getPaginationParams } = require("../utils/helpers");
const { getRecommendedCandidatesForJob } = require("../services/matchingEngine");

exports.getApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("studentId").populate("jobId").populate("companyId");
    if (!application) return sendError(res, "Application not found.", 404);
    return sendSuccess(res, "Application details.", application);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getRecommendedCandidates = async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user._id });
    if (!company) return sendError(res, "Company not found.", 404);

    const job = await Job.findOne({ _id: req.params.jobId, companyId: company._id });
    if (!job) return sendError(res, "Job not found.", 404);

    const candidates = await getRecommendedCandidatesForJob(job._id, 20);
    return sendSuccess(res, "Recommended candidates.", candidates);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getAllApplications = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.jobId) filter.jobId = req.query.jobId;
    if (req.query.companyId) filter.companyId = req.query.companyId;

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate({ path: "studentId", select: "fullName email phone" })
        .populate({ path: "jobId", select: "title" })
        .populate({ path: "companyId", select: "companyName" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Application.countDocuments(filter),
    ]);

    return sendPaginated(res, "Applications fetched.", applications, total, page, limit);
  } catch (err) {
    return sendError(res, err.message);
  }
};
