require("dotenv").config();
const Razorpay = require("razorpay");

const razorpayInstance = new Razorpay({
  key_id: "rzp_test_RsGQ0EyONIWnyi",
  key_secret:"gN0xl7IvpO6WDpns8N3gIHcE",
});

module.exports = razorpayInstance;
