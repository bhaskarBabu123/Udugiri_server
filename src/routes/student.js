const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const { protect } = require("../middlewares/auth");
const { authorize, requirePasswordCreated } = require("../middlewares/roleCheck");
const { uploadResume, uploadPhoto } = require("../middlewares/upload");
const validate = require("../middlewares/validate");
const { body } = require("express-validator");

const isStudent = [protect, authorize("student"), requirePasswordCreated];

/**
 * @swagger
 * tags:
 *   name: Student
 *   description: Student profile and job management
 */

/**
 * @swagger
 * /api/students/profile:
 *   get:
 *     summary: Get student profile
 *     tags: [Student]
 *     responses:
 *       200:
 *         description: Student profile data
 */
router.get("/profile", isStudent, studentController.getProfile);

/**
 * @swagger
 * /api/students/profile:
 *   put:
 *     summary: Update student profile
 *     tags: [Student]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               experienceYears:
 *                 type: number
 *               expectedSalary:
 *                 type: number
 *               preferredLocations:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put("/profile", isStudent, studentController.updateProfile);

/**
 * @swagger
 * /api/students/resume:
 *   post:
 *     summary: Upload resume (PDF/DOC, max 5MB)
 *     tags: [Student]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Resume uploaded
 */
router.post("/resume", isStudent, uploadResume, studentController.uploadResume);

/**
 * @swagger
 * /api/students/photo:
 *   post:
 *     summary: Upload profile photo
 *     tags: [Student]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Photo uploaded
 */
router.post("/photo", isStudent, uploadPhoto, studentController.uploadPhoto);

/**
 * @swagger
 * /api/students/dashboard:
 *   get:
 *     summary: Get student dashboard stats
 *     tags: [Student]
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get("/dashboard", isStudent, studentController.getDashboard);

/**
 * @swagger
 * /api/students/recommended-jobs:
 *   get:
 *     summary: Get AI-matched recommended jobs
 *     tags: [Student]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of recommended jobs with match scores
 */
router.get("/recommended-jobs", isStudent, studentController.getRecommendedJobs);

/**
 * @swagger
 * /api/students/jobs/{jobId}/apply:
 *   post:
 *     summary: Apply to a job
 *     tags: [Student]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coverLetter:
 *                 type: string
 *     responses:
 *       201:
 *         description: Application submitted
 *       400:
 *         description: Profile incomplete or already applied
 */
router.post(
  "/jobs/:jobId/apply",
  isStudent,
  [body("coverLetter").optional().isString()],
  validate,
  studentController.applyJob
);

/**
 * @swagger
 * /api/students/applications:
 *   get:
 *     summary: Get student's job applications
 *     tags: [Student]
 *     parameters:
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
 *         description: List of applications
 */
router.get("/applications", isStudent, studentController.getApplications);

/**
 * @swagger
 * /api/students/saved-jobs:
 *   get:
 *     summary: Get saved/bookmarked jobs
 *     tags: [Student]
 *     responses:
 *       200:
 *         description: Saved jobs list
 */
router.get("/saved-jobs", isStudent, studentController.getSavedJobs);

/**
 * @swagger
 * /api/students/jobs/{jobId}/save:
 *   post:
 *     summary: Toggle save/unsave a job
 *     tags: [Student]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job saved or removed from saved
 */
router.post("/jobs/:jobId/save", isStudent, studentController.toggleSaveJob);

/**
 * @swagger
 * /api/students/notifications:
 *   get:
 *     summary: Get student notifications
 *     tags: [Student]
 *     responses:
 *       200:
 *         description: Notifications list
 */
router.get("/notifications", isStudent, studentController.getNotifications);

module.exports = router;
