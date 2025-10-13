import app from "./app.js";
import { env } from "./config/env.js";

const port = Number(env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`🚚 Logistics API running on http://localhost:${port}`);
});
