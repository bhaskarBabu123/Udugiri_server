require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");


const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║   careers.udugiri.com API Server                ║
║   Running on port ${PORT}                          ║
║   Swagger Docs: http://localhost:${PORT}/api-docs   ║
║   Health:       http://localhost:${PORT}/api/healthz ║
╚══════════════════════════════════════════════════╝
    `);
  });

  const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("unhandledRejection", (err) => {
    console.error("Unhandled Promise Rejection:", err);
    server.close(() => process.exit(1));
  });
};

start();
