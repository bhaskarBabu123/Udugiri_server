const crypto = require("crypto");
const Payment = require("../models/Payment");
const Subscription = require("../models/Subscription");
const Company = require("../models/Company");
const { notifyPaymentSuccess } = require("../services/notificationService");
const { sendSuccess, sendError } = require("../utils/response");

const PLANS = {
  one_time: { price: 4999, validityDays: 365, jobsAllowed: 1, hiresAllowed: 1, unlockCredits: 20 },
  monthly: { price: 9999, validityDays: 30, jobsAllowed: 10, hiresAllowed: 10, unlockCredits: 100 },
  yearly: { price: 79999, validityDays: 365, jobsAllowed: 999999, hiresAllowed: 999999, unlockCredits: 999999 },
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, subscriptionId } = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return sendError(res, "Payment verification failed. Invalid signature.", 400);
    }

    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId },
      {
        razorpayPaymentId,
        razorpaySignature,
        status: "paid",
      },
      { new: true }
    );

    if (!payment) return sendError(res, "Payment record not found.", 404);

    const subscription = await Subscription.findById(subscriptionId || payment.subscriptionId);
    if (!subscription) return sendError(res, "Subscription not found.", 404);

    subscription.isActive = true;
    subscription.startDate = new Date();
    subscription.endDate = new Date(Date.now() + subscription.validityDays * 24 * 60 * 60 * 1000);
    subscription.paymentStatus = "paid";
    await subscription.save();

    const plan = PLANS[subscription.planType];

    const company = await Company.findByIdAndUpdate(
      payment.companyId,
      {
        currentPlan: subscription.planType,
        subscriptionActive: true,
        subscriptionStart: subscription.startDate,
        subscriptionEnd: subscription.endDate,
        hireQuota: plan.hiresAllowed,
        candidateUnlockCredits: plan.unlockCredits,
        jobsAllowed: plan.jobsAllowed,
        hiresUsed: 0,
        unlocksUsed: 0,
        jobsUsed: 0,
      },
      { new: true }
    );

    const companyUser = await require("../models/User").findOne({ _id: company.userId });
    if (companyUser) {
      await notifyPaymentSuccess(companyUser._id, subscription.planType, payment.amount * 100);
    }

    return sendSuccess(res, "Payment verified and subscription activated.", {
      paymentId: payment._id,
      subscriptionId: subscription._id,
      plan: subscription.planType,
      validUntil: subscription.endDate,
    });
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature." });
    }

    const { event, payload } = req.body;

    if (event === "payment.captured") {
      const paymentData = payload.payment.entity;
      await Payment.findOneAndUpdate(
        { razorpayOrderId: paymentData.order_id },
        { status: "paid", razorpayPaymentId: paymentData.id }
      );
    }

    if (event === "payment.failed") {
      const paymentData = payload.payment.entity;
      await Payment.findOneAndUpdate(
        { razorpayOrderId: paymentData.order_id },
        { status: "failed", failureReason: paymentData.error_description }
      );
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    return res.status(500).json({ success: false });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user._id });
    if (!company) return sendError(res, "Company not found.", 404);

    const payments = await Payment.find({ companyId: company._id }).sort({ createdAt: -1 });
    return sendSuccess(res, "Payment history.", payments);
  } catch (err) {
    return sendError(res, err.message);
  }
};
