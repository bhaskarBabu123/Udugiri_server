const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: String,
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
      index: true,
    },
    planType: String,
    invoiceNumber: { type: String, unique: true },
    invoiceUrl: String,
    failureReason: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

paymentSchema.pre("save", function (next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 90000) + 10000;
    this.invoiceNumber = `INV-${year}${month}-${random}`;
  }
  next();
});

module.exports = mongoose.model("Payment", paymentSchema);
