// src/types/index.ts

export type UUID = string;

/* ---------- Core domain ---------- */
export interface Client {
  id: UUID;
  client_name?: string | null;
  email?: string | null;
}

export type PartyRole = "COMPANY" | "CLIENT" | "OTHER";

export interface ContractParty {
  party_role: PartyRole;
  legal_name: string;
  brand_name?: string | null;
  cin?: string | null;
  pan?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  postcode?: string | null;
  phone?: string | null;
  contact_person?: string | null;
  email?: string | null;
}

/* ---------- Child tables (payload shapes) ---------- */
export interface OdaRule {
  oda_code?: string; // or pincode_prefix in incoming payload
  oda_label?: string | null; // e.g., "ODA-1"
  rate_per_kg?: number;
  min_per_cn?: number;
  max_per_cn?: number | null;
  surcharge_flat?: number; // legacy alias
  surcharge_pct?: number; // legacy alias
  notes?: string | null;
}

export interface NonMetroRule {
  distance_km_max?: number;
  rate_per_kg?: number;
  surcharge_flat?: number; // legacy alias
}

export interface RegionSurcharge {
  region_name?: string;
  base_relative_to?: string | null;
  addl_rate_per_kg?: number;
  surcharge_flat?: number; // legacy alias
  description?: string; // legacy alias
  notes?: string | null;
}

export interface VasCharge {
  vas_code?: string;
  calc_method?: string | null; // e.g., RATE_PER_KG / RATE_PER_CN / MULTIPLIER
  rate_per_kg?: number | null;
  rate_per_cn?: number | null;
  min_per_cn?: number | null;
  max_per_cn?: number | null;
  multiplier?: number | null;
  extra_per_cn?: number | null;
  free_hours?: number | null;
  floor_start?: number | null;
  city_scope?: string | null;
  notes?: string | null;
}

export type InsuranceType =
  | "OWNER_RISK_FOV"
  | "CARRIER_RISK_FRAGILE"
  | "CARRIER_RISK_NON_FRAGILE"
  | "STANDARD"
  | string; // allow future enum values

export interface InsuranceRule {
  insurance_type?: InsuranceType;
  pct_of_invoice?: number | null;
  min_per_cn?: number | null;
  liability_desc?: string | null;
  provider?: string | null; // legacy alias
  rate_pct?: number | null; // legacy alias
  min_declared_value?: number | null; // legacy alias
  notes?: string | null;
}

export interface IncentiveSlab {
  tonnage_min?: number;
  tonnage_max?: number | null;
  discount_pct?: number;
  threshold_shipments?: number; // legacy alias
  threshold_revenue?: number; // legacy alias
  incentive_pct?: number; // legacy alias
}

export interface ContractAnnexure {
  annexure_code?: string;
  title?: string | null;
  raw_text?: string | null;
}

/* ---------- Extended sections (optional but handy) ---------- */
export interface MetroCongestionCity {
  city: string;
  charge_per_cn: number;
  notes?: string | null;
}

export interface SpecialHandlingCharge {
  range_min_kg: number;
  range_max_kg?: number | null;
  rate_per_kg: number;
}

export interface PickupCharge {
  service_code: string;
  rate_per_kg?: number | null;
  min_per_pickup?: number | null;
  notes?: string | null;
}

export interface ZoneRate {
  zone_name: string;
  rate_per_kg: number;
  tat_days: number;
  min_cn_rs: number;
  coverage_areas?: string | null;
}

/* ---------- Contract payload (create/update) ---------- */
export type ContractType = "GENERAL" | "RATE" | "PROJECT" | "OTHER";
export type ChargingMechanism =
  | "HIGHER_OF_ACTUAL_OR_VOL"
  | "EXACT_ACTUAL"
  | "OTHER";
export type RoundingRule = "ROUND_UP" | "ROUND_NEAREST" | "NONE";

export interface ContractPayload {
  client_id: UUID;
  contract_code: string;

  purpose?: string | null;
  agreement_date?: string | null;
  agreement_place?: string | null;
  term_months?: number | null;
  term_start?: string | null;
  term_end?: string | null;
  territory_desc?: string | null;

  termination_notice_days?: number;
  non_compete_cooling_months?: number;
  jurisdiction_city?: string | null;
  arbitration_seat?: string | null;
  arbitration_language?: string | null;
  prepayment_required?: boolean;

  capacity_booking_day_of_month?: number | null;
  capacity_additional_notice_days?: number | null;
  settlement_frequency?: "DAILY" | "WEEKLY" | "MONTHLY" | string;

  price_floor_enabled?: boolean;
  price_ceiling_enabled?: boolean;
  taxes_gst_pct?: number;

  metro_congestion_charge_per_cn?: number;
  cn_charge_per_cn?: number;
  docket_charge_per_cn?: number;

  min_chargeable_weight_kg?: number;
  min_chargeable_freight_rs?: number;

  fuel_base_pct?: number | null;
  fuel_diesel_base_price?: number | null;
  fuel_slope_pct_per_1pct?: number | null;

  contract_type?: ContractType;
  payment_terms_days?: number | null;
  charging_mechanism?: ChargingMechanism;
  rounding_rule?: RoundingRule;
  opa_excluded?: boolean;

  odd_size_len_ft?: number | null;
  odd_size_wid_ft?: number | null;
  odd_size_ht_ft?: number | null;
  odd_size_pricing?: string | null;

  volumetric_bases?: Array<number | { cft_base: number; basis_text?: string }>;

  parties?: ContractParty[];
  oda_rules?: OdaRule[];
  non_metro_rules?: NonMetroRule[];
  region_surcharges?: RegionSurcharge[];
  vas_charges?: VasCharge[];
  insurance_rules?: InsuranceRule[];
  incentive_slabs?: IncentiveSlab[];
  annexures?: ContractAnnexure[];

  metro_congestion_cities?: MetroCongestionCity[];
  special_handling?: SpecialHandlingCharge[];
  pickup_charges?: PickupCharge[];
  zone_rates?: ZoneRate[];
}
