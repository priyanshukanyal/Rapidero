import axios from "axios";
import { env } from "../config/env.js";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const res = await axios.post(
    `${env.RIVIGO_BASE_URL}/oauth/token`,
    { grant_type: "client_credentials" },
    {
      headers: {
        Authorization: `Basic ${env.RIVIGO_AUTH_BASIC}`,
        "Content-Type": "application/json",
      },
    }
  );

  const payload = res.data?.payload || {};
  const token = payload.access_token as string;
  const expiresIn = Number(payload.expires_in || 0); // seconds

  if (!token) {
    throw new Error("Rivigo auth failed: no access_token in response");
  }

  cachedToken = {
    value: token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return token;
}

type RivigoBookingResult = {
  bookingId: number;
  cnote: string;
  cnotePrintUrl?: string | null;
  rawResponse: any;
};

export async function createRivigoBookingFromForm(input: {
  formData: any;
  invoices: any[];
  packages: any[];
}): Promise<RivigoBookingResult> {
  const { formData: f, invoices, packages } = input;

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
        // Let Rivigo generate CN → cnote: "" (empty string)
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
          volume: 0,
          unit: "CM", // or "IN" if your UI is inches
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
          paymentMode: f.paymentMode || "PAID", // map from your UI
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

  const res = await axios.post(
    `${env.RIVIGO_BASE_URL}/operations/booking`,
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        appUuid: env.RIVIGO_APP_UUID,
        "Content-Type": "application/json",
      },
    }
  );

  const payload = res.data?.payload;
  if (!payload) {
    throw new Error("Rivigo booking: missing payload in response");
  }

  const bookingId = payload.bookingId;
  const first = payload.individualBookingList?.[0];

  if (!first || !first.cnote) {
    throw new Error(
      "Rivigo booking: missing cnote in individualBookingList[0]"
    );
  }

  return {
    bookingId,
    cnote: String(first.cnote),
    cnotePrintUrl: first.cnotePrintUrl || null,
    rawResponse: res.data,
  };
}
