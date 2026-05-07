const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/applicationController");
const { protect } = require("../middlewares/auth");
const { authorize } = require("../middlewares/roleCheck");

/**
 * @swagger
 * tags:
 *   name: Applications
 *   description: Job application management
 */

/**
 * @swagger
 * /api/applications/{id}:
 *   get:
 *     summary: Get a specific application by ID
 *     tags: [Applications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application details
 */
router.get("/:id", protect, applicationController.getApplication);

/**
 * @swagger
 * /api/applications:
 *   get:
 *     summary: List all applications (admin only)
 *     tags: [Applications]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: string
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: All applications
 */
router.get("/", [protect, authorize("admin")], applicationController.getAllApplications);

/**
 * @swagger
 * /api/applications/recommended/{jobId}:
 *   get:
 *     summary: Get recommended candidates for a job
 *     tags: [Applications]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ranked candidate matches
 */
router.get(
  "/recommended/:jobId",
  [protect, authorize("company")],
  applicationController.getRecommendedCandidates
);

module.exports = router;
