import app from "./app.js";
import { env } from "./config/env.js";
import path from "node:path";
import { fileURLToPath } from "url";

// Resolve __dirname in ESM (same approach as in app.ts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Recommended behind IIS/ARR
// app.set("trust proxy", 1);

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

// Serve SPA index.html for any non-API route (client-side routing fallback)
// Place this after mounting all API routes in app.ts and before error handlers.
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Error handlers (should be last middleware)
// app.use(notFound);
// app.use(errorHandler);

app.listen(port, () => {
  const prefix = env.API_PREFIX || "/api/v1";
  console.log(`🚚 Logistics API running at ${baseUrl}${prefix}`);
  console.log(`🩺 Health: ${baseUrl}/health`);
  console.log(`🔐 CORS allowed: ${env.CORS_ORIGIN || "http://localhost:5173"}`);
});
