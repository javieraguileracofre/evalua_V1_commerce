import { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link } from "expo-router";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts
} from "@expo-google-fonts/plus-jakarta-sans";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { theme } from "@/theme";
import {
  createCustomerMaster,
  createSupplierMaster,
  listCustomersMaster,
  listSuppliersMaster
} from "@/modules/pro/masters/partners/service";
import {
  EMPTY_PARTNER_FORM,
  type CustomerMaster,
  type PartnerFormValues,
  type SupplierMaster
} from "@/modules/pro/masters/partners/types";

type PartnerMode = "customers" | "suppliers";

export default function ProMastersScreen() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold
  });
  const font = fontsLoaded
    ? {
        regular: "PlusJakartaSans_400Regular" as const,
        semi: "PlusJakartaSans_600SemiBold" as const,
        bold: "PlusJakartaSans_700Bold" as const
      }
    : { regular: undefined, semi: undefined, bold: undefined };

  const [mode, setMode] = useState<PartnerMode>("customers");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<PartnerFormValues>(EMPTY_PARTNER_FORM);
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierMaster[]>([]);

  useEffect(() => {
    loadMasterData();
  }, []);

  async function loadMasterData() {
    setLoading(true);
    try {
      const [customersData, suppliersData] = await Promise.all([listCustomersMaster(), listSuppliersMaster()]);
      setCustomers(customersData);
      setSuppliers(suppliersData);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo cargar maestros.");
    } finally {
      setLoading(false);
    }
  }

  function onChangeField<K extends keyof PartnerFormValues>(field: K, value: PartnerFormValues[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function onSave() {
    setLoading(true);
    try {
      if (mode === "customers") {
        await createCustomerMaster(form);
      } else {
        await createSupplierMaster(form);
      }
      setForm(EMPTY_PARTNER_FORM);
      await loadMasterData();
      Alert.alert("OK", mode === "customers" ? "Cliente guardado." : "Proveedor guardado.");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setLoading(false);
    }
  }

  const dataset = mode === "customers" ? customers : suppliers;

  return (
    <Screen>
      <Card>
        <View style={styles.headerRow}>
          <Link style={[styles.linkBack, { fontFamily: font.bold }]} href="/pro">
            Volver a PRO
          </Link>
          <Text style={[styles.title, { fontFamily: font.bold }]}>Maestro de Clientes y Proveedores</Text>
        </View>
        <Text style={[styles.subtitle, { fontFamily: font.regular }]}>
          Base inicial para ERP Premium con datos maestros por cuenta/usuario.
        </Text>
      </Card>

      <Card>
        <View style={styles.switchRow}>
          <Pressable
            style={[styles.switchButton, mode === "customers" && styles.switchButtonActive]}
            onPress={() => setMode("customers")}
          >
            <Text style={[styles.switchText, { fontFamily: font.bold }, mode === "customers" && styles.switchTextActive]}>
              Clientes
            </Text>
          </Pressable>
          <Pressable
            style={[styles.switchButton, mode === "suppliers" && styles.switchButtonActive]}
            onPress={() => setMode("suppliers")}
          >
            <Text style={[styles.switchText, { fontFamily: font.bold }, mode === "suppliers" && styles.switchTextActive]}>
              Proveedores
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.label, { fontFamily: font.semi }]}>Razon social / Nombre</Text>
        <TextInput style={[styles.input, { fontFamily: font.regular }]} value={form.business_name} onChangeText={(v) => onChangeField("business_name", v)} />

        <Text style={[styles.label, { fontFamily: font.semi }]}>RUT</Text>
        <TextInput style={[styles.input, { fontFamily: font.regular }]} value={form.rut} onChangeText={(v) => onChangeField("rut", v)} />

        <Text style={[styles.label, { fontFamily: font.semi }]}>Correo</Text>
        <TextInput
          style={[styles.input, { fontFamily: font.regular }]}
          value={form.email}
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={(v) => onChangeField("email", v)}
        />

        <Text style={[styles.label, { fontFamily: font.semi }]}>Telefono</Text>
        <TextInput style={[styles.input, { fontFamily: font.regular }]} value={form.phone} onChangeText={(v) => onChangeField("phone", v)} />

        <Text style={[styles.label, { fontFamily: font.semi }]}>Direccion</Text>
        <TextInput style={[styles.input, { fontFamily: font.regular }]} value={form.address} onChangeText={(v) => onChangeField("address", v)} />

        <Text style={[styles.label, { fontFamily: font.semi }]}>Contacto principal</Text>
        <TextInput
          style={[styles.input, { fontFamily: font.regular }]}
          value={form.contact_name}
          onChangeText={(v) => onChangeField("contact_name", v)}
        />

        <Text style={[styles.label, { fontFamily: font.semi }]}>Condiciones de pago</Text>
        <TextInput
          style={[styles.input, { fontFamily: font.regular }]}
          value={form.payment_terms}
          onChangeText={(v) => onChangeField("payment_terms", v)}
          placeholder="Ej: 30 dias, contado, transferencia"
          placeholderTextColor={theme.colors.muted}
        />

        <Pressable style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={onSave} disabled={loading}>
          <Text style={[styles.primaryButtonText, { fontFamily: font.bold }]}>
            {loading ? "Guardando..." : mode === "customers" ? "Guardar cliente" : "Guardar proveedor"}
          </Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={[styles.listTitle, { fontFamily: font.bold }]}>
          {mode === "customers" ? "Clientes registrados" : "Proveedores registrados"}
        </Text>
        <FlatList
          data={dataset}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.rowItem}>
              <Text style={[styles.rowTitle, { fontFamily: font.bold }]}>{item.business_name}</Text>
              <Text style={[styles.rowMeta, { fontFamily: font.regular }]}>
                RUT: {item.rut ?? "-"} · Correo: {item.email ?? "-"}
              </Text>
              <Text style={[styles.rowMeta, { fontFamily: font.regular }]}>
                Telefono: {item.phone ?? "-"} · Contacto: {item.contact_name ?? "-"}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { fontFamily: font.regular }]}>
              Sin registros aun para este maestro.
            </Text>
          }
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  linkBack: { color: theme.colors.secondary, fontWeight: "700" },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: "700" },
  subtitle: { color: theme.colors.muted, marginTop: 8 },
  switchRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  switchButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceAlt
  },
  switchButtonActive: {
    borderColor: theme.colors.secondary,
    backgroundColor: "rgba(196, 163, 90, 0.14)"
  },
  switchText: { color: theme.colors.muted, fontWeight: "700" },
  switchTextActive: { color: theme.colors.secondary },
  label: { color: theme.colors.text, marginBottom: 4, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: 12
  },
  primaryButtonText: { color: "#fff", textAlign: "center", fontWeight: "700" },
  buttonDisabled: { opacity: 0.6 },
  listTitle: { color: theme.colors.text, fontSize: 16, marginBottom: 8 },
  rowItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceAlt
  },
  rowTitle: { color: theme.colors.text, fontSize: 14 },
  rowMeta: { color: theme.colors.muted, marginTop: 2, fontSize: 12 },
  emptyText: { color: theme.colors.muted, fontSize: 13 }
});
