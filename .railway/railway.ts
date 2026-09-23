import { defineRailway, github, preserve, project, service } from "railway/iac";

// This repository owns only the application service. PostgreSQL, buckets,
// domains, and secrets remain managed by their existing Railway resources.
export const partial = "TRANSSERVICESAB";

export default defineRailway((context) => {
  const application = service("TRANSSERVICESAB", {
    source: github("Owen101297/TRANSSERVICESAB", {
      branch: context.isEnvironment("staging")
        ? "modernize-railway-iac"
        : "main",
    }),
    build: "npm run build",
    preDeploy: "npm run db:migrate",
    start: "npm start",
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    env: {
      AWS_ACCESS_KEY_ID: preserve(),
      AWS_DEFAULT_REGION: preserve(),
      AWS_ENDPOINT_URL: preserve(),
      AWS_S3_BUCKET_NAME: preserve(),
      AWS_SECRET_ACCESS_KEY: preserve(),
      DATABASE_URL: preserve(),
      GPS_WEBHOOK_API_KEY: preserve(),
      SESSION_SECRET: preserve(),
    },
  });

  return project("ERP-TRANSSERVICES A&B", {
    resources: [application],
  });
});
