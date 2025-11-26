// src/scripts/importPincodes.js

import fs from "fs";
import path from "path";
import csv from "csv-parser";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";
import "dotenv/config";
import { v4 as uuidv4 } from "uuid";

// ESM __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CSV path
const csvPath = path.resolve(
  __dirname,
  "../../data/City wise pincode list- Rivigo.csv"
);

// MySQL pool
const pool = await mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, // logistics
  waitForConnections: true,
  connectionLimit: 10,
});

// --- Helpers --------------------------------------------------

// Generic numeric parser: returns number or null (never NaN)
function numericOrNull(val) {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s) return null;

  const lower = s.toLowerCase();
  if (["na", "n/a", "null", "-", "nan"].includes(lower)) return null;

  // Remove commas and stray chars like whitespace
  const cleaned = s.replace(/,/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

// Clean TAT values specifically
function parseTat(val) {
  return numericOrNull(val);
}

async function run() {
  console.log("📄 Reading CSV:", csvPath);

  const rows = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (r) => rows.push(r))
      .on("end", resolve)
      .on("error", reject);
  });

  console.log("👍 Loaded rows:", rows.length);

  const values = rows
    .map((r) => {
      const pincode = String(r.Pincode || "").trim();
      const city = String(r.city || "").trim();
      const state = String(r.state || "").trim();

      if (!pincode || !city) return null; // skip junk rows

      const pickupActive =
        String(r.Pickup || "")
          .trim()
          .toUpperCase() === "ACTIVE"
          ? 1
          : 0;
      const deliveryActive =
        String(r.Delivery || "")
          .trim()
          .toUpperCase() === "ACTIVE"
          ? 1
          : 0;

      const odaBucketName = r["Oda Charge BucketName"]
        ? String(r["Oda Charge BucketName"]).trim() || null
        : null;

      const odaBucketValue = numericOrNull(r["Oda Charge BucketValue"]);
      const opaTat = parseTat(r["Opa Extra Tat"]);
      const odaTat = parseTat(r["Oda Extra Tat"]);

      return [
        uuidv4(), // id
        pincode,
        city,
        state,
        pickupActive,
        deliveryActive,
        odaBucketName,
        odaBucketValue,
        opaTat,
        odaTat,
      ];
    })
    .filter(Boolean);

  console.log("🧮 Insert-ready rows:", values.length);

  const sql = `
    INSERT INTO pincode_master (
      id, pincode, city, state, pickup_active, delivery_active,
      oda_bucket_name, oda_bucket_value, opa_extra_tat, oda_extra_tat
    )
    VALUES ?
    ON DUPLICATE KEY UPDATE
      city = VALUES(city),
      state = VALUES(state),
      pickup_active = VALUES(pickup_active),
      delivery_active = VALUES(delivery_active),
      oda_bucket_name = VALUES(oda_bucket_name),
      oda_bucket_value = VALUES(oda_bucket_value),
      opa_extra_tat = VALUES(opa_extra_tat),
      oda_extra_tat = VALUES(oda_extra_tat)
  `;

  const BATCH_SIZE = 2000;
  let inserted = 0;

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    console.log(`🚚 Inserting batch ${i / BATCH_SIZE + 1} (${batch.length})`);
    await pool.query(sql, [batch]);
    inserted += batch.length;
  }

  console.log("🎉 DONE. Rows inserted/updated:", inserted);

  await pool.end();
}

run().catch((err) => {
  console.error("❌ Import error:", err);
  process.exit(1);
});
