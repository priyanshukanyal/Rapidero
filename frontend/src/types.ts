export type Role = "ADMIN" | "OPS" | "CLIENT" | "FIELD_EXEC";

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  roles: Role[];
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface Client {
  id: string;
  client_code: string;
  client_name: string;
  email?: string | null;
  phone?: string | null;
  created_at?: string;
}

/** ==== CONTRACT SHAPES (match backend JSON) ==== */
export type SettlementFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
export interface ContractAnnexure {
  annexure_code: string;
  title: string;
  raw_text: string;
}
export interface ContractParty {
  party_role: "COMPANY" | "CLIENT" | "OTHER";
  legal_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
}
export interface OdaRule {
  pincode_prefix: string;
  surcharge_flat?: number;
  surcharge_pct?: number;
}
export interface NonMetroRule {
  city: string;
  tier?: "TIER2" | "TIER3" | "RURAL";
  surcharge_flat?: number;
  surcharge_pct?: number;
}
export interface RegionSurcharge {
  region_code: string;
  description?: string;
  surcharge_flat?: number;
  surcharge_pct?: number;
}
export interface VasCharge {
  code:
    | "FRAGILE"
    | "LIQUID"
    | "PICKUP_FLOOR"
    | "DELIVERY_FLOOR"
    | "ODA"
    | "NON_METRO"
    | "OTHER";
  flat?: number;
  pct?: number;
}
export interface InsuranceRule {
  min_declared_value?: number;
  rate_pct: number;
  provider?: string;
  notes?: string;
}
export interface IncentiveSlab {
  threshold_shipments?: number;
  threshold_revenue?: number;
  incentive_pct: number;
  from_date?: string;
  to_date?: string;
}

export interface ContractPayload {
  client_id: string;
  contract_code: string;
  title?: string;
  purpose?: string;
  start_date?: string;
  end_date?: string;
  settlement_frequency: SettlementFrequency;
  credit_days?: number;
  taxes_gst_pct?: number;
  fuel_surcharge_pct?: number;
  price_floor_enabled?: boolean;
  price_ceiling_enabled?: boolean;
  min_charge?: number;
  volumetric_bases: number[];
  parties: ContractParty[];
  oda_rules: OdaRule[];
  non_metro_rules: NonMetroRule[];
  region_surcharges: RegionSurcharge[];
  vas_charges: VasCharge[];
  insurance_rules: InsuranceRule[];
  incentive_slabs: IncentiveSlab[];
  annexures: ContractAnnexure[];
  notes?: string;
}
