// src/services/rivigoClient.ts
import axios from "axios";
import { env } from "../config/env.js";

let cachedToken: { value: string; expiresAt: number } | null = null;

/* -------------------------------------------------------------------------- */
/*                             Rivigo API typings                             */
/* -------------------------------------------------------------------------- */

interface RivigoAuthPayload {
  access_token?: string;
  expires_in?: number | string;
  [key: string]: any;
}

interface RivigoAuthResponse {
  payload?: RivigoAuthPayload;
  [key: string]: any;
}

interface RivigoIndividualBooking {
  cnote?: string | number;
  cnotePrintUrl?: string | null;
  bookingId?: number | string;
  clientAddressId?: number | string;
  serviceCategory?: string;
  boxDetailList?: any[];
  [key: string]: any;
}

interface RivigoBookingPayload {
  bookingId?: number | string;
  clientAddressId?: number | string;
  serviceCategory?: string;
  individualBookingList?: RivigoIndividualBooking[];
  [key: string]: any;
}

interface RivigoBookingResponse {
  payload?: RivigoBookingPayload;
  [key: string]: any;
}

/* -------------------------------------------------------------------------- */
/*                            Token helper (cached)                           */
/* -------------------------------------------------------------------------- */

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    console.log("[RIVIGO] Using cached token");
    return cachedToken.value;
  }

  console.log("[RIVIGO] Requesting new access token...");
  console.log("[RIVIGO] BASE_URL =", env.RIVIGO_BASE_URL);

  try {
    const res = await axios.post<RivigoAuthResponse>(
      `${env.RIVIGO_BASE_URL}/oauth/token`,
      { grant_type: "client_credentials" },
      {
        headers: {
          Authorization: `Basic ${env.RIVIGO_AUTH_BASIC}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(
      "[RIVIGO] Auth raw response:",
      JSON.stringify(res.data, null, 2)
    );

    const payload: RivigoAuthPayload = res.data.payload || {};
    const token = payload.access_token as string | undefined;
    const expiresInRaw = payload.expires_in ?? 0;
    const expiresIn = Number(expiresInRaw); // seconds

    if (!token) {
      console.error(
        "[RIVIGO] Auth failed – no access_token in response. payload =",
        payload
      );
      throw new Error("Rivigo auth failed: no access_token in response");
    }

    cachedToken = {
      value: token,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    console.log(
      "[RIVIGO] Got access token. Expires in (s):",
      expiresIn,
      " ExpiresAt:",
      new Date(cachedToken.expiresAt).toISOString()
    );

    return token;
  } catch (err: any) {
    console.error(
      "[RIVIGO] Auth error:",
      err.response?.status,
      err.response?.data || err.message
    );
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/*                            Booking creation API                            */
/* -------------------------------------------------------------------------- */

export type RivigoBookingResult = {
  bookingId: number | string | null;
  cnote: string;
  cnotePrintUrl?: string | null;
  clientAddressId?: number | string | null;
  serviceCategory?: string | null;
  boxDetailList?: any[];
  rawResponse: any;
};

export async function createRivigoBookingFromForm(input: {
  formData: any;
  invoices: any[];
  packages: any[];
}): Promise<RivigoBookingResult> {
  const { formData: f, invoices, packages } = input;

  console.log(
    "[RIVIGO] createRivigoBookingFromForm called with:",
    JSON.stringify(
      {
        formData: f,
        invoicesCount: invoices.length,
        packagesCount: packages.length,
      },
      null,
      2
    )
  );

  const totalPkgs = packages.reduce((t, p) => t + Number(p.count || 0), 0);

  const token = await getAccessToken();

  // Build Rivigo payload (minimal but valid)
  const body = {
    scheduledBookingDateTime: f.bookingDateTime
      ? new Date(f.bookingDateTime).getTime()
      : Date.now(),
    fromAddress: {
      addressDetails: {
        detailedAddress: f.consignorAddress,
        city: f.consignorCity,
        pincode: Number(f.consignorPincode),
        latitude: 0,
        longitude: 0,
        floorNumber: 1,
        addressCode: 0,
      },
      callDetails: {
        name: f.consignorName,
        phone: Number(f.consignorPhone),
        email: f.consignorEmail || "no-reply@example.com",
      },
      companyDetails: {
        companyName: f.consignorCompany || "NA",
        GSTIN: f.consignorGSTIN || null,
        PAN: f.consignorPAN || null,
      },
    },
    individualBookingList: [
      {
        cnote: "",
        toAddressList: [
          {
            addressDetails: {
              detailedAddress: f.consigneeAddress,
              city: f.consigneeCity,
              pincode: Number(f.consigneePincode),
              latitude: 0,
              longitude: 0,
              floorNumber: 1,
              addressCode: 0,
            },
            callDetails: {
              name: f.consigneeName,
              phone: Number(f.consigneePhone),
              email: f.consigneeEmail || "no-reply@example.com",
            },
            companyDetails: {
              companyName: f.consigneeCompany || "NA",
              GSTIN: f.consigneeGSTIN || null,
              PAN: f.consigneePAN || null,
            },
          },
        ],
        loadDetails: {
          totalBoxes: totalPkgs || Number(f.noOfPackages || 1),
          weight: Number(f.weight || 0.5),
          volume: 1,
          unit: "CM", // ya "IN" agar tum inches use kar rahe ho
          boxTypesList: packages.map((p: any) => ({
            length: Number(p.length || 0),
            breadth: Number(p.breadth || 0),
            height: Number(p.height || 0),
            boxTypeCount: Number(p.count || 1),
          })),
          invoicesList: invoices.map((inv: any) => ({
            invoiceNo: inv.invoiceNumber,
            invoiceValue: Number(inv.amount || 0),
            ewaybillNumber: inv.ewaybillNumber
              ? Number(inv.ewaybillNumber)
              : undefined,
            hsnCodesList: inv.hsnCode
              ? [
                  {
                    hsnCode: Number(inv.hsnCode),
                    amount: Number(inv.hsnAmount || inv.amount || 0),
                  },
                ]
              : [],
          })),
          barcodesList: Array.isArray(f.barcodes) ? f.barcodes : [],
          retailType: "NORMAL",
          paymentMode: f.paymentMode || "PAID",
          taxId: f.consignorPAN || "ABCDE1234F",
          taxIdType: "PAN",
          packaging: "CARTON",
          contents: f.content || "General goods",
          isFragile: !!f.valueAddedServices?.fragile,
          isLiquidHandlingApplicable: !!f.valueAddedServices?.liquidHandling,
          isHazardousMaterialApplicable: false,
          isDacc: false,
          deliveryType: (f.deliveryType || "NORMAL").toUpperCase(),
          appointmentId: "UI-PORTAL",
          appointmentTime: new Date().getTime(),
          deliveryClient: "OTHERS",
          deliveryClientDetails: {
            fcName: "",
            purchaseOrders: [],
          },
          toPayAmount: 0,
          isLogiFreightAirCn: false,
        },
        clientReferenceNumbers: f.clientShipmentCode
          ? [f.clientShipmentCode]
          : [],
      },
    ],
    clientCode: env.RIVIGO_CLIENT_CODE,
  };

  console.log("[RIVIGO] Booking request body:", JSON.stringify(body, null, 2));

  try {
    const res = await axios.post<RivigoBookingResponse>(
      `${env.RIVIGO_BASE_URL}${
        env.RIVIGO_BOOKING_PATH || "/operations/booking"
      }`,
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          appUuid: env.RIVIGO_APP_UUID,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(
      "[RIVIGO] Booking raw response:",
      JSON.stringify(res.data, null, 2)
    );

    // Kuch tenants me response payload ke andar hota hai, kuch me direct
    const root: RivigoBookingPayload =
      (res.data.payload as RivigoBookingPayload) || (res.data as any);

    const bookingId = root.bookingId ?? null;
    const rootClientAddressId = root.clientAddressId ?? null;
    const rootServiceCategory = root.serviceCategory ?? null;

    const first: RivigoIndividualBooking | undefined =
      root.individualBookingList?.[0];

    if (!first || !first.cnote) {
      console.error(
        "[RIVIGO] Booking response missing cnote in individualBookingList[0]. root =",
        JSON.stringify(root, null, 2)
      );
      throw new Error(
        "Rivigo booking: missing cnote in individualBookingList[0]"
      );
    }

    const result: RivigoBookingResult = {
      bookingId,
      cnote: String(first.cnote),
      cnotePrintUrl: first.cnotePrintUrl || null,
      clientAddressId: first.clientAddressId ?? rootClientAddressId ?? null,
      serviceCategory: first.serviceCategory ?? rootServiceCategory ?? null,
      boxDetailList: Array.isArray(first.boxDetailList)
        ? first.boxDetailList
        : [],
      rawResponse: res.data,
    };

    console.log("[RIVIGO] Parsed booking result:", result);

    return result;
  } catch (err: any) {
    console.error(
      "[RIVIGO] Booking error:",
      err.response?.status,
      err.response?.data || err.message
    );
    throw err;
  }
}
