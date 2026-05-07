const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "careers.udugiri.com - Hiring Portal API",
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
        url: process.env.API_BASE_URL || "http://localhost:5000",
        description: "Development Server",
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
apis: ["**/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
