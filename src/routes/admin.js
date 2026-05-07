const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect } = require("../middlewares/auth");
const { authorize } = require("../middlewares/roleCheck");
const { uploadImport } = require("../middlewares/upload");
const { importLimiter } = require("../middlewares/rateLimiter");
const validate = require("../middlewares/validate");
const { body } = require("express-validator");

const isAdmin = [protect, authorize("admin")];

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin control panel — analytics, approvals, bulk imports
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard with full platform analytics
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Platform-wide stats and recent activity
 */
router.get("/dashboard", isAdmin, adminController.getDashboard);

/**
 * @swagger
 * /api/admin/import/students:
 *   post:
 *     summary: Bulk import students from Excel/CSV
 *     tags: [Admin]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               import:
 *                 type: string
 *                 format: binary
 *                 description: Excel or CSV file with columns name, email, phone, course, skills
 *     responses:
 *       200:
 *         description: Import results with created/skipped counts
 */
router.post("/import/students", isAdmin, importLimiter, uploadImport, adminController.bulkImportStudents);

/**
 * @swagger
 * /api/admin/import/companies:
 *   post:
 *     summary: Bulk import companies from Excel/CSV
 *     tags: [Admin]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               import:
 *                 type: string
 *                 format: binary
 *                 description: Excel or CSV file with columns companyName, email, phone
 *     responses:
 *       200:
 *         description: Import results
 */
router.post("/import/companies", isAdmin, importLimiter, uploadImport, adminController.bulkImportCompanies);

/**
 * @swagger
 * /api/admin/import/jobs:
 *   post:
 *     summary: Bulk import jobs from Excel/CSV
 *     tags: [Admin]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               import:
 *                 type: string
 *                 format: binary
 *                 description: Excel or CSV with columns title, description, companyEmail, skills, location
 *     responses:
 *       200:
 *         description: Import results
 */
router.post("/import/jobs", isAdmin, importLimiter, uploadImport, adminController.bulkImportJobs);

/**
 * @swagger
 * /api/admin/companies/{id}/approve:
 *   patch:
 *     summary: Approve a company registration
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company approved
 */
router.patch("/companies/:id/approve", isAdmin, adminController.approveCompany);

/**
 * @swagger
 * /api/admin/companies/{id}/reject:
 *   patch:
 *     summary: Reject a company registration
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Company rejected
 */
router.patch(
  "/companies/:id/reject",
  isAdmin,
  [body("reason").notEmpty()],
  validate,
  adminController.rejectCompany
);

/**
 * @swagger
 * /api/admin/jobs/{id}/approve:
 *   patch:
 *     summary: Approve a job posting
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job approved and now visible to students
 */
router.patch("/jobs/:id/approve", isAdmin, adminController.approveJob);

/**
 * @swagger
 * /api/admin/jobs/{id}/reject:
 *   patch:
 *     summary: Reject a job posting
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Job rejected
 */
router.patch(
  "/jobs/:id/reject",
  isAdmin,
  [body("reason").notEmpty()],
  validate,
  adminController.rejectJob
);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List all users with filters
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, student, company]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Users list
 */
router.get("/users", isAdmin, adminController.listUsers);

/**
 * @swagger
 * /api/admin/users/{id}/toggle-status:
 *   patch:
 *     summary: Activate or deactivate a user
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User status toggled
 */
router.patch("/users/:id/toggle-status", isAdmin, adminController.toggleUserStatus);

/**
 * @swagger
 * /api/admin/students:
 *   get:
 *     summary: List all students
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: isPlaced
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Students list
 */
router.get("/students", isAdmin, adminController.listStudents);

/**
 * @swagger
 * /api/admin/companies:
 *   get:
 *     summary: List all companies with approval filter
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: approvalStatus
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: Companies list
 */
router.get("/companies", isAdmin, adminController.listCompanies);

/**
 * @swagger
 * /api/admin/jobs:
 *   get:
 *     summary: List all jobs with status filter
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending_approval, approved, rejected, closed]
 *     responses:
 *       200:
 *         description: Jobs list
 */
router.get("/jobs", isAdmin, adminController.listJobs);

/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: Get payment reports and revenue analytics
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment reports
 */
router.get("/payments", isAdmin, adminController.getPaymentReports);

/**
 * @swagger
 * /api/admin/broadcast:
 *   post:
 *     summary: Send notification broadcast to all users or by role
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, student, company]
 *                 description: Leave blank to send to all users
 *     responses:
 *       200:
 *         description: Broadcast sent
 */
router.post(
  "/broadcast",
  isAdmin,
  [body("title").notEmpty(), body("message").notEmpty()],
  validate,
  adminController.sendBroadcast
);

module.exports = router;
