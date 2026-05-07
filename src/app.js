require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { generalLimiter } = require("./middlewares/rateLimiter");


const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/student");
const companyRoutes = require("./routes/company");
const jobRoutes = require("./routes/job");
const applicationRoutes = require("./routes/application");
const adminRoutes = require("./routes/admin");
const subscriptionRoutes = require("./routes/subscription");
const paymentRoutes = require("./routes/payment");
const notificationRoutes = require("./routes/notification");

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(generalLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "careers.udugiri.com API Docs",
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "tag",
    },
  })
);

app.get("/api/healthz", (req, res) => {
  res.json({
    success: true,
    message: "careers.udugiri.com API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    docs: "/api-docs",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error.",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
