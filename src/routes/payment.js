const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { protect } = require("../middlewares/auth");
const { authorize, requirePasswordCreated } = require("../middlewares/roleCheck");
const validate = require("../middlewares/validate");
const { body } = require("express-validator");

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Razorpay payment verification and history
 */

/**
 * @swagger
 * /api/payments/verify:
 *   post:
 *     summary: Verify Razorpay payment signature and activate subscription
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpayOrderId, razorpayPaymentId, razorpaySignature]
 *             properties:
 *               razorpayOrderId:
 *                 type: string
 *               razorpayPaymentId:
 *                 type: string
 *               razorpaySignature:
 *                 type: string
 *               subscriptionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified and subscription activated
 *       400:
 *         description: Invalid signature
 */
router.post(
  "/verify",
  [protect, authorize("company"), requirePasswordCreated],
  [
    body("razorpayOrderId").notEmpty(),
    body("razorpayPaymentId").notEmpty(),
    body("razorpaySignature").notEmpty(),
  ],
  validate,
  paymentController.verifyPayment
);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Razorpay webhook endpoint
 *     tags: [Payments]
 *     security: []
 *     description: Called by Razorpay to notify payment events. Validates X-Razorpay-Signature.
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post("/webhook", express.raw({ type: "application/json" }), paymentController.handleWebhook);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get payment history for current company
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Payment history
 */
router.get(
  "/history",
  [protect, authorize("company"), requirePasswordCreated],
  paymentController.getPaymentHistory
);

module.exports = router;
