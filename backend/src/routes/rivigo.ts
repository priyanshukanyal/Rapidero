// src/routes/rivigo.ts
import express from "express";
import axios from "axios";

const router = express.Router();

const RIVIGO_BASE = "https://client-integration-api.rivigo.com";
const BOOKING_PATH = "/operations/booking";

// Optional: ask Rivigo which fields to include. You can remove this param.
// Common useful fields: cnotePrintUrl, fromOU, toOU
const DEFAULT_FIELDS = ["cnotePrintUrl", "fromOU", "toOU"];

router.post("/bookings", async (req, res) => {
  try {
    const appUuid = process.env.RIVIGO_APP_UUID;
    if (!appUuid) {
      return res.status(500).json({ message: "Missing RIVIGO_APP_UUID" });
    }

    // Your UI already builds this in Rivigo schema
    const payload = req.body;

    // Basic guardrails (optional)
    if (!payload?.clientCode) {
      return res.status(400).json({ message: "clientCode is required" });
    }
    if (!payload?.fromAddress || !payload?.individualBookingList?.length) {
      return res
        .status(400)
        .json({ message: "fromAddress & individualBookingList required" });
    }

    // Build URL with fields= query if you want extra props back
    const url = new URL(RIVIGO_BASE + BOOKING_PATH);
    if (DEFAULT_FIELDS.length) {
      DEFAULT_FIELDS.forEach((f) => url.searchParams.append("fields", f));
    }

    const { data } = await axios.post(url.toString(), payload, {
      headers: {
        "Content-Type": "application/json",
        appUuid, // <-- required by Rivigo
      },
      timeout: 20000,
      // If Rivigo uses a self-signed TLS in UAT you may need httpsAgent, but prod shouldn't.
    });

    // TODO (recommended): persist mapping for reconciliation / tracking
    // await db.booking.create({
    //   our_cn: payload.individualBookingList[0]?.cnote,
    //   rivigo_booking_id: data?.payload?.individualBookingList?.[0]?.bookingId,
    //   rivigo_pickup_id: data?.payload?.pickupId,
    //   cnote: data?.payload?.individualBookingList?.[0]?.cnote,
    //   cnote_print_url: data?.payload?.individualBookingList?.[0]?.cnotePrintUrl,
    //   request_json: payload,
    //   response_json: data,
    // });

    return res.status(200).json(data);
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    const body = err?.response?.data ?? { message: err.message };
    // await db.integration_error.create({ where: "rivigo/booking", payload: req.body, error: body, status });
    return res.status(status).json(body);
  }
});

export default router;
