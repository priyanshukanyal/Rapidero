// import app from "./app.js";
// import { env } from "./config/env.js";

// const port = Number(env.PORT ?? 4000);
// const host = (env as any).HOST ?? "0.0.0.0"; // optional HOST support

// app.listen(port, host, () => {
//   const prefix = env.API_PREFIX || "/api/v1";
//   const shownHost = host === "0.0.0.0" ? "localhost" : host;
//   console.log(
//     `🚚 Logistics API running at http://${shownHost}:${port}${prefix}`
//   );
//   console.log(`🩺 Health: http://${shownHost}:${port}/health`);
//   console.log(`🔐 CORS allowed: ${env.CORS_ORIGIN || "http://localhost:5173"}`);
// });

// import app from "./app.js";
// import { env } from "./config/env.js";

// // Azure automatically sets process.env.PORT
// const port = Number(process.env.PORT || env.PORT || 4000);
// const host = (env as any).HOST ?? "0.0.0.0";

// app.listen(port, host, () => {
//   const prefix = env.API_PREFIX || "/api/v1";

//   // Use Azure public URL when deployed
//   const baseUrl =
//     process.env.NODE_ENV === "production"
//       ? "https://rapidero-aza7f8a6gnewfgfx.centralindia-01.azurewebsites.net"
//       : `http://localhost:${port}`;

//   console.log(`🚚 Logistics API running at ${baseUrl}${prefix}`);
//   console.log(`🩺 Health: ${baseUrl}/health`);
//   console.log(`🔐 CORS allowed: ${env.CORS_ORIGIN || "http://localhost:5173"}`);
// });

import app from "./app.js";
import { env } from "./config/env.js";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Recommended behind IIS/ARR
app.set("trust proxy", 1);
// Serve static files if traffic reaches Node (IIS also serves /public directly)
app.use(
  express.static(path.resolve(__dirname, "../public"), {
    maxAge: "30d",
    index: "index.html",
  })
);

// Port from Azure, fallback for local dev
const port = Number(process.env.PORT || env.PORT || 4000);

// Public URL on Azure (no hardcode)
const siteHost =
  process.env.WEBSITE_HOSTNAME || // e.g., myapp.azurewebsites.net
  (env as any).HOSTNAME ||
  "";

const baseUrl =
  process.env.NODE_ENV === "production" && siteHost
    ? `https://${siteHost}`
    : `http://localhost:${port}`;

app.listen(port, () => {
  const prefix = env.API_PREFIX || "/api/v1";
  console.log(`🚚 Logistics API running at ${baseUrl}${prefix}`);
  console.log(`🩺 Health: ${baseUrl}/health`);
  console.log(`🔐 CORS allowed: ${env.CORS_ORIGIN || "http://localhost:5173"}`);
});
