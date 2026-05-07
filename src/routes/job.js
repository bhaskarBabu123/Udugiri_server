const express = require("express");
const router = express.Router();
const jobController = require("../controllers/jobController");
const { protect, optionalAuth } = require("../middlewares/auth");
const { authorize, requireApproved, requirePasswordCreated } = require("../middlewares/roleCheck");
const validate = require("../middlewares/validate");
const { body } = require("express-validator");

const isApprovedCompany = [protect, authorize("company"), requirePasswordCreated, requireApproved];

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job posting and browsing
 */

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: List all approved jobs (public, filterable)
 *     tags: [Jobs]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: workMode
 *         schema:
 *           type: string
 *           enum: [onsite, remote, hybrid]
 *       - in: query
 *         name: jobType
 *         schema:
 *           type: string
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *           description: Comma-separated skills
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
 *         description: Paginated job listings
 */
router.get("/", optionalAuth, jobController.listJobs);

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get job details
 *     tags: [Jobs]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job details with company info
 *       404:
 *         description: Job not found
 */
router.get("/:id", jobController.getJobDetails);

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create a new job posting
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, location]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               skillsRequired:
 *                 type: array
 *                 items:
 *                   type: string
 *               experienceRequired:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                   max:
 *                     type: number
 *               salaryMin:
 *                 type: number
 *               salaryMax:
 *                 type: number
 *               openings:
 *                 type: integer
 *               location:
 *                 type: string
 *               workMode:
 *                 type: string
 *                 enum: [onsite, remote, hybrid]
 *               jobType:
 *                 type: string
 *                 enum: [full_time, part_time, internship, contract, freelance]
 *               deadline:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Job created, pending approval
 *       403:
 *         description: Subscription required
 */
router.post(
  "/",
  isApprovedCompany,
  [
    body("title").notEmpty().trim(),
    body("description").notEmpty(),
    body("location").notEmpty(),
  ],
  validate,
  jobController.createJob
);

/**
 * @swagger
 * /api/jobs/company/list:
 *   get:
 *     summary: Get company's own job listings
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company's jobs
 */
router.get("/company/list", isApprovedCompany, jobController.getCompanyJobs);

/**
 * @swagger
 * /api/jobs/{id}:
 *   put:
 *     summary: Update a job posting
 *     tags: [Jobs]
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
 *     responses:
 *       200:
 *         description: Job updated and resubmitted
 */
router.put("/:id", isApprovedCompany, jobController.updateJob);

/**
 * @swagger
 * /api/jobs/{id}:
 *   delete:
 *     summary: Delete a job posting
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job deleted
 */
router.delete("/:id", isApprovedCompany, jobController.deleteJob);

/**
 * @swagger
 * /api/jobs/{id}/close:
 *   patch:
 *     summary: Close a job (stop accepting applications)
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job closed
 */
router.patch("/:id/close", isApprovedCompany, jobController.closeJob);

module.exports = router;
