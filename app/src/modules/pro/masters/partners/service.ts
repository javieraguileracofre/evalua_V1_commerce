import { supabase } from "@/lib/supabase";
import type { CustomerMaster, PartnerFormValues, SupplierMaster } from "./types";

function normalizeForm(values: PartnerFormValues) {
  return {
    business_name: values.business_name.trim(),
    rut: values.rut.trim() || null,
    email: values.email.trim().toLowerCase() || null,
    phone: values.phone.trim() || null,
    address: values.address.trim() || null,
    contact_name: values.contact_name.trim() || null,
    payment_terms: values.payment_terms.trim() || null
  };
}

export async function listCustomersMaster() {
  const { data, error } = await supabase.from("customers_master").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CustomerMaster[]) ?? [];
}

export async function listSuppliersMaster() {
  const { data, error } = await supabase.from("suppliers_master").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as SupplierMaster[]) ?? [];
}

export async function createCustomerMaster(values: PartnerFormValues) {
  const payload = normalizeForm(values);
  if (!payload.business_name) throw new Error("El nombre del cliente es obligatorio.");
  const { error } = await supabase.from("customers_master").insert(payload);
  if (error) throw error;
}

export async function createSupplierMaster(values: PartnerFormValues) {
  const payload = normalizeForm(values);
  if (!payload.business_name) throw new Error("El nombre del proveedor es obligatorio.");
  const { error } = await supabase.from("suppliers_master").insert(payload);
  if (error) throw error;
}
