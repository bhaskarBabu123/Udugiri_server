const Subscription = require("../models/Subscription");
const Company = require("../models/Company");
const razorpay = require("../config/razorpay");
const { sendSuccess, sendError } = require("../utils/response");

const PLANS = Subscription.statics?.PLANS || {
  one_time: { price: 4999, validityDays: 365, jobsAllowed: 1, hiresAllowed: 1, unlockCredits: 20, label: "One Time Hire" },
  monthly: { price: 9999, validityDays: 30, jobsAllowed: 10, hiresAllowed: 10, unlockCredits: 100, label: "Monthly" },
  yearly: { price: 79999, validityDays: 365, jobsAllowed: -1, hiresAllowed: -1, unlockCredits: -1, label: "Yearly (Unlimited)" },
};

exports.getPlans = async (req, res) => {
  try {
    const plans = Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      ...plan,
      priceFormatted: `₹${plan.price.toLocaleString("en-IN")}`,
      features: [
        plan.jobsAllowed === -1 ? "Unlimited Jobs" : `${plan.jobsAllowed} Job Posting${plan.jobsAllowed > 1 ? "s" : ""}`,
        plan.hiresAllowed === -1 ? "Unlimited Hires" : `${plan.hiresAllowed} Hire${plan.hiresAllowed > 1 ? "s" : ""}`,
        plan.unlockCredits === -1 ? "Unlimited Unlocks" : `${plan.unlockCredits} Candidate Unlocks`,
        plan.validityDays === 365 ? "1 Year Validity" : `${plan.validityDays} Days Validity`,
      ],
    }));
    return sendSuccess(res, "Subscription plans.", plans);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { planType } = req.body;
    const plan = PLANS[planType];
    if (!plan) return sendError(res, "Invalid plan type.", 400);

    const company = await Company.findOne({ userId: req.user._id });
    if (!company) return sendError(res, "Company not found.", 404);
    if (!company.isApproved) return sendError(res, "Company must be approved before purchasing.", 403);

    const amountInPaise = plan.price * 100;
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `sub_${company._id}_${Date.now()}`,
      notes: { companyId: company._id.toString(), planType },
    });

    const Payment = require("../models/Payment");
    const payment = await Payment.create({
      companyId: company._id,
      razorpayOrderId: order.id,
      amount: plan.price,
      currency: "INR",
      status: "created",
      planType,
    });

    const subscription = await Subscription.create({
      companyId: company._id,
      planType,
      price: plan.price,
      validityDays: plan.validityDays,
      jobsAllowed: plan.jobsAllowed,
      hiresAllowed: plan.hiresAllowed,
      unlockCredits: plan.unlockCredits,
      paymentStatus: "pending",
      paymentId: payment._id,
    });

    await Payment.findByIdAndUpdate(payment._id, { subscriptionId: subscription._id });

    return sendSuccess(res, "Order created.", {
      orderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      plan,
      subscriptionId: subscription._id,
      paymentId: payment._id,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getMySubscription = async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user._id });
    if (!company) return sendError(res, "Company not found.", 404);

    const subscriptions = await Subscription.find({ companyId: company._id })
      .sort({ createdAt: -1 })
      .limit(5);

    return sendSuccess(res, "Subscription details.", {
      currentPlan: company.currentPlan,
      isActive: company.subscriptionActive,
      subscriptionEnd: company.subscriptionEnd,
      remainingHires: company.remainingHires,
      remainingUnlocks: company.remainingUnlocks,
      remainingJobs: company.currentPlan === "yearly" ? "Unlimited" : company.remainingJobs,
      history: subscriptions,
    });
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.adminManageSubscription = async (req, res) => {
  try {
    const { companyId, planType, action } = req.body;
    const company = await Company.findById(companyId);
    if (!company) return sendError(res, "Company not found.", 404);

    const plan = PLANS[planType];
    if (!plan) return sendError(res, "Invalid plan.", 400);

    if (action === "activate") {
      company.currentPlan = planType;
      company.subscriptionActive = true;
      company.subscriptionStart = new Date();
      company.subscriptionEnd = new Date(Date.now() + plan.validityDays * 24 * 60 * 60 * 1000);
      company.hireQuota = plan.hiresAllowed === -1 ? 999999 : plan.hiresAllowed;
      company.candidateUnlockCredits = plan.unlockCredits === -1 ? 999999 : plan.unlockCredits;
      company.jobsAllowed = plan.jobsAllowed === -1 ? 999999 : plan.jobsAllowed;
      await company.save();
      return sendSuccess(res, "Subscription activated.", company);
    }

    if (action === "deactivate") {
      company.subscriptionActive = false;
      await company.save();
      return sendSuccess(res, "Subscription deactivated.");
    }

    return sendError(res, "Invalid action.", 400);
  } catch (err) {
    return sendError(res, err.message);
  }
};
