import type { Request, Response } from "express";
import { pool } from "../../db/mysql.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const asNum = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const toCode = (v: string | undefined, allowed: string[], def?: string) => {
  const s = (v ?? def ?? "").toUpperCase().trim();
  if (!s) return null;
  if (!allowed.includes(s)) throw new Error(`Invalid code: ${v}`);
  return s;
};

export const createCnFromUI = asyncHandler(
  async (req: Request, res: Response) => {
    const body = req.body || {};
    const f = body.formData || {};
    const invoices = Array.isArray(body.invoices) ? body.invoices : [];
    const packages = Array.isArray(body.packages) ? body.packages : [];

    const totalPkgs = packages.reduce(
      (t: number, p: any) => t + asNum(p.count, 0),
      0
    );
    const totalVol = packages.reduce(
      (t: number, p: any) =>
        t +
        asNum(p.length) * asNum(p.breadth) * asNum(p.height) * asNum(p.count),
      0
    );

    const cnNumber = body.cnNumber || `CN${Date.now()}`;

    const packingType = toCode(f.packingType, [
      "BUNDLE",
      "BOX",
      "ENVELOPE",
      "BAG",
    ]);
    const chargeBasis = toCode(f.chargeBasis, ["WEIGHT", "VOLUME", "FIXED"]);
    const serviceCat = toCode(f.serviceCategory || "NORMAL", [
      "NORMAL",
      "EXPRESS",
    ]);
    const deliveryTyp = toCode(f.deliveryType || "NORMAL", [
      "NORMAL",
      "EXPRESS",
    ]);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `INSERT INTO consignments
       (id, cn_number, client_id, client_name_snapshot, billing_entity_name, client_shipment_code,
        contract_id, provider_awb, carrier_name, ewaybill_no, reference_no,
        booking_datetime, package_count, content, packing_type_code, charge_basis_code, conversion_factor,
        shipper_name, shipper_phone, shipper_email, shipper_company, shipper_gstin, shipper_pan,
        shipper_address, shipper_city, shipper_state, shipper_postcode,
        consignee_name, consignee_phone, consignee_email, consignee_company, consignee_gstin, consignee_pan,
        consignee_address, consignee_city, consignee_state, consignee_postcode,
        actual_weight_kg, delivery_type_code, service_category_code,
        vas_fragile, vas_liquid_handling, vas_pickup_floor, vas_pickup_floor_no, vas_delivery_floor, vas_delivery_floor_no,
        invoices_total_value_rs, total_volume_cm3, raw_request_json)
       VALUES
       (UUID(), ?, ?, ?, ?, ?,
        NULL, NULL, NULL, NULL, NULL,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, NULL, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, NULL, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?)
      `,
        [
          cnNumber,
          body.clientId || null,
          f.client || null,
          f.billingEntity || null,
          f.clientShipmentCode || null,
          f.bookingDateTime ? new Date(f.bookingDateTime) : null,
          (f.noOfPackages || totalPkgs) | 0,
          f.content || null,
          packingType,
          chargeBasis,
          f.conversionFactor != null ? asNum(f.conversionFactor, 0) : null,

          f.consignorName,
          f.consignorPhone,
          f.consignorEmail || null,
          f.consignorCompany || null,
          f.consignorGSTIN || null,
          f.consignorPAN || null,
          f.consignorAddress,
          f.consignorCity || null,
          f.consignorPincode || null,

          f.consigneeName,
          f.consigneePhone,
          f.consigneeEmail || null,
          f.consigneeCompany || null,
          f.consigneeGSTIN || null,
          f.consigneePAN || null,
          f.consigneeAddress,
          f.consigneeCity || null,
          f.consigneePincode || null,

          f.weight != null ? asNum(f.weight, 0) : null,
          deliveryTyp,
          serviceCat,

          f.valueAddedServices?.fragile ? 1 : 0,
          f.valueAddedServices?.liquidHandling ? 1 : 0,
          f.valueAddedServices?.pickupFloor ? 1 : 0,
          body.pickupFloorNo != null ? asNum(body.pickupFloorNo, 0) : null,
          f.valueAddedServices?.deliveryFloor ? 1 : 0,
          body.deliveryFloorNo != null ? asNum(body.deliveryFloorNo, 0) : null,

          invoices.reduce((t: number, inv: any) => t + asNum(inv.amount, 0), 0),
          totalVol,
          JSON.stringify(body),
        ]
      );

      const [[cn]]: any = await conn.query(
        `SELECT id FROM consignments WHERE cn_number=? LIMIT 1`,
        [cnNumber]
      );
      const consignmentId = cn.id;

      for (const inv of invoices) {
        await conn.query(
          `INSERT INTO consignment_invoices
         (id, consignment_id, invoice_number, amount_rs, ewaybill_number, hsn_code, hsn_amount_rs, images_json)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, NULL)`,
          [
            consignmentId,
            inv.invoiceNumber,
            asNum(inv.amount, 0),
            inv.ewaybillNumber || null,
            inv.hsnCode || null,
            inv.hsnAmount != null ? asNum(inv.hsnAmount, 0) : null,
          ]
        );
      }

      for (const p of packages) {
        const lineVol =
          asNum(p.length) * asNum(p.breadth) * asNum(p.height) * asNum(p.count);
        await conn.query(
          `INSERT INTO consignment_packages
         (id, consignment_id, length_cm, breadth_cm, height_cm, pkg_count, line_volume_cm3)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
          [
            consignmentId,
            asNum(p.length),
            asNum(p.breadth),
            asNum(p.height),
            asNum(p.count, 1),
            lineVol,
          ]
        );
      }

      // initial status
      await conn.query(
        `INSERT INTO consignment_status_history (id, consignment_id, status_code, remarks)
       VALUES (UUID(), ?, 'CREATED', 'CN created via UI')`,
        [consignmentId]
      );

      await conn.commit();
      res
        .status(201)
        .json({ ok: true, id: consignmentId, cn_number: cnNumber });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
);

export const getCnWithDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const { cnNumber } = req.params;
    const [[cn]]: any = await pool.query(
      `SELECT * FROM consignments WHERE cn_number=? LIMIT 1`,
      [cnNumber]
    );
    if (!cn) return res.status(404).json({ error: "CN not found" });

    const [invoices]: any = await pool.query(
      `SELECT id, invoice_number, amount_rs, ewaybill_number, hsn_code, hsn_amount_rs FROM consignment_invoices WHERE consignment_id=?`,
      [cn.id]
    );
    const [packages]: any = await pool.query(
      `SELECT id, length_cm, breadth_cm, height_cm, pkg_count, line_volume_cm3 FROM consignment_packages WHERE consignment_id=?`,
      [cn.id]
    );
    const [history]: any = await pool.query(
      `SELECT status_code, location_text, remarks, actor_user_id, event_time FROM consignment_status_history WHERE consignment_id=? ORDER BY event_time ASC`,
      [cn.id]
    );

    try {
      if (cn.raw_request_json)
        cn.raw_request_json = JSON.parse(cn.raw_request_json);
    } catch {}
    res.json({ ...cn, invoices, packages, history });
  }
);
