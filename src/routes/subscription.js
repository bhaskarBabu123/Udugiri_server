const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");
const { protect } = require("../middlewares/auth");
const { authorize, requireApproved, requirePasswordCreated } = require("../middlewares/roleCheck");
const validate = require("../middlewares/validate");
const { body } = require("express-validator");

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription plans and management
 */

/**
 * @swagger
 * /api/subscriptions/plans:
 *   get:
 *     summary: Get all available subscription plans
 *     tags: [Subscriptions]
 *     security: []
 *     responses:
 *       200:
 *         description: List of plans with features and pricing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         enum: [one_time, monthly, yearly]
 *                       label:
 *                         type: string
 *                       price:
 *                         type: number
 *                       features:
 *                         type: array
 *                         items:
 *                           type: string
 */
router.get("/plans", subscriptionController.getPlans);

/**
 * @swagger
 * /api/subscriptions/create-order:
 *   post:
 *     summary: Create a Razorpay payment order for a subscription
 *     tags: [Subscriptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planType]
 *             properties:
 *               planType:
 *                 type: string
 *                 enum: [one_time, monthly, yearly]
 *     responses:
 *       200:
 *         description: Razorpay order created with orderId and keyId
 *       403:
 *         description: Company must be approved
 */
router.post(
  "/create-order",
  [protect, authorize("company"), requirePasswordCreated, requireApproved],
  [body("planType").isIn(["one_time", "monthly", "yearly"])],
  validate,
  subscriptionController.createOrder
);

/**
 * @swagger
 * /api/subscriptions/my-subscription:
 *   get:
 *     summary: Get current company subscription details
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Current subscription info with remaining quotas
 */
router.get(
  "/my-subscription",
  [protect, authorize("company"), requirePasswordCreated],
  subscriptionController.getMySubscription
);

/**
 * @swagger
 * /api/subscriptions/admin/manage:
 *   post:
 *     summary: Admin manually activate or deactivate a company subscription
 *     tags: [Subscriptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyId, planType, action]
 *             properties:
 *               companyId:
 *                 type: string
 *               planType:
 *                 type: string
 *                 enum: [one_time, monthly, yearly]
 *               action:
 *                 type: string
 *                 enum: [activate, deactivate]
 *     responses:
 *       200:
 *         description: Subscription updated
 */
router.post(
  "/admin/manage",
  [protect, authorize("admin")],
  [
    body("companyId").notEmpty(),
    body("planType").isIn(["one_time", "monthly", "yearly"]),
    body("action").isIn(["activate", "deactivate"]),
  ],
  validate,
  subscriptionController.adminManageSubscription
);

module.exports = router;
