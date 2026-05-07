const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "careers.udugiri.com  Portal Backned",
      version: "1.0.0",
      description:
        "Production-ready SaaS Hiring Portal backend API documentation. Includes auth, student, company, admin, jobs, applications, subscriptions, and payments.",
      contact: {
        name: "Udugiri Careers",
        email: "admin@udugiri.com",
      },
    },
    servers: [
      {
        url: "https://udugiri-server.onrender.com",
        description: "Production Server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            errors: { type: "array", items: { type: "object" } },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: { type: "object" },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            total: { type: "integer" },
            page: { type: "integer" },
            pages: { type: "integer" },
            limit: { type: "integer" },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
apis: ["./src/routes/**/*.js"]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
