import app from "./app.js";
import { env } from "./config/env.js";

const port = Number(env.PORT ?? 4000);
const host = (env as any).HOST ?? "0.0.0.0"; // optional HOST support

app.listen(port, host, () => {
  const prefix = env.API_PREFIX || "/api/v1";
  const shownHost = host === "0.0.0.0" ? "localhost" : host;
  console.log(
    `🚚 Logistics API running at http://${shownHost}:${port}${prefix}`
  );
  console.log(`🩺 Health: http://${shownHost}:${port}/health`);
  console.log(`🔐 CORS allowed: ${env.CORS_ORIGIN || "http://localhost:5173"}`);
});
