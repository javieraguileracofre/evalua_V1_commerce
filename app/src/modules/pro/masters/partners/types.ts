export type MasterStatus = "active" | "inactive";

export type PartnerBase = {
  id: string;
  business_name: string;
  rut: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contact_name: string | null;
  payment_terms: string | null;
  status: MasterStatus;
  created_at: string;
};

export type CustomerMaster = PartnerBase;
export type SupplierMaster = PartnerBase;

export type PartnerFormValues = {
  business_name: string;
  rut: string;
  email: string;
  phone: string;
  address: string;
  contact_name: string;
  payment_terms: string;
};

export const EMPTY_PARTNER_FORM: PartnerFormValues = {
  business_name: "",
  rut: "",
  email: "",
  phone: "",
  address: "",
  contact_name: "",
  payment_terms: ""
};
