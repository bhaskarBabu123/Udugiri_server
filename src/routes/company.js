const express = require("express");
const router = express.Router();
const companyController = require("../controllers/companyController");
const { protect } = require("../middlewares/auth");
const { authorize, requireApproved, requirePasswordCreated } = require("../middlewares/roleCheck");
const { uploadLogo } = require("../middlewares/upload");
const validate = require("../middlewares/validate");
const { body } = require("express-validator");

const isCompany = [protect, authorize("company"), requirePasswordCreated];
const isApprovedCompany = [protect, authorize("company"), requirePasswordCreated, requireApproved];

/**
 * @swagger
 * tags:
 *   name: Company
 *   description: Company registration, profile, and hiring management
 */

/**
 * @swagger
 * /api/companies/register:
 *   post:
 *     summary: Register a new company
 *     tags: [Company]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, companyName]
 *             properties:
 *               email:
 *                 type: string
 *               companyName:
 *                 type: string
 *               phone:
 *                 type: string
 *               hrName:
 *                 type: string
 *               website:
 *                 type: string
 *               industry:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registered and OTP sent
 *       400:
 *         description: Email already registered
 */
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("companyName").notEmpty().trim(),
  ],
  validate,
  companyController.register
);

/**
 * @swagger
 * /api/companies/profile:
 *   get:
 *     summary: Get company profile
 *     tags: [Company]
 *     responses:
 *       200:
 *         description: Company profile
 */
router.get("/profile", isCompany, companyController.getProfile);

/**
 * @swagger
 * /api/companies/profile:
 *   put:
 *     summary: Update company profile
 *     tags: [Company]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *               phone:
 *                 type: string
 *               hrName:
 *                 type: string
 *               website:
 *                 type: string
 *               industry:
 *                 type: string
 *               companySize:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put("/profile", isCompany, companyController.updateProfile);

/**
 * @swagger
 * /api/companies/logo:
 *   post:
 *     summary: Upload company logo
 *     tags: [Company]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Logo uploaded
 */
router.post("/logo", isCompany, uploadLogo, companyController.uploadLogo);

/**
 * @swagger
 * /api/companies/dashboard:
 *   get:
 *     summary: Get company dashboard stats
 *     tags: [Company]
 *     responses:
 *       200:
 *         description: Dashboard data with stats and subscription info
 */
router.get("/dashboard", isCompany, companyController.getDashboard);

/**
 * @swagger
 * /api/companies/applicants:
 *   get:
 *     summary: Get all applicants for company's jobs
 *     tags: [Company]
 *     parameters:
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Applicants list (partial data unless unlocked)
 */
router.get("/applicants", isApprovedCompany, companyController.getApplicants);

/**
 * @swagger
 * /api/companies/applicants/{applicationId}/status:
 *   patch:
 *     summary: Update application status (shortlist, reject, hire, etc.)
 *     tags: [Company]
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [under_review, shortlisted, rejected, selected, hired, joined]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
  "/applicants/:applicationId/status",
  isApprovedCompany,
  [body("status").notEmpty()],
  validate,
  companyController.updateApplicationStatus
);

/**
 * @swagger
 * /api/companies/applicants/{applicationId}/interview:
 *   post:
 *     summary: Schedule an interview
 *     tags: [Company]
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scheduledAt, mode]
 *             properties:
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               mode:
 *                 type: string
 *                 enum: [online, offline, phone]
 *               meetingLink:
 *                 type: string
 *               location:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Interview scheduled
 */
router.post(
  "/applicants/:applicationId/interview",
  isApprovedCompany,
  [body("scheduledAt").isISO8601(), body("mode").notEmpty()],
  validate,
  companyController.scheduleInterview
);

/**
 * @swagger
 * /api/companies/candidates/{studentId}/unlock:
 *   post:
 *     summary: Unlock full candidate profile using credits
 *     tags: [Company]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Candidate profile unlocked
 *       403:
 *         description: No credits remaining or subscription inactive
 */
router.post("/candidates/:studentId/unlock", isApprovedCompany, companyController.unlockCandidate);

/**
 * @swagger
 * /api/companies/billing:
 *   get:
 *     summary: Get billing and payment history
 *     tags: [Company]
 *     responses:
 *       200:
 *         description: Billing history
 */
router.get("/billing", isCompany, companyController.getBillingHistory);

module.exports = router;
