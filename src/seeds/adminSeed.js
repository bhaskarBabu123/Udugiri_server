require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const connectDB = require("../config/db");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

const seed = async () => {
  await connectDB();

  const adminEmail = process.env.ADMIN_EMAIL || "admin@udugiri.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";

  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    console.log(`Admin already exists: ${adminEmail}`);
    process.exit(0);
  }

  const admin = new User({
    email: adminEmail,
    password: adminPassword,
    role: "admin",
    isFirstLogin: false,
    isPasswordCreated: true,
    isApproved: true,
    isActive: true,
    otpVerified: true,
  });

  await admin.save();

  console.log("✅ Admin user created successfully!");
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`\n⚠️  IMPORTANT: Change the admin password after first login!`);

  process.exit(0);
};

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
