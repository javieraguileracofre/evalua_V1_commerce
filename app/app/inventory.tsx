import { useEffect, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts
} from "@expo-google-fonts/plus-jakarta-sans";
import { Link } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { supabase } from "@/lib/supabase";
import { InventoryItem } from "@/types";
import { theme } from "@/theme";
import { saveOrSharePdfFromBase64 } from "@/lib/export";
import { formatCurrencyCl, formatIntegerCl } from "@/lib/format";
import { buildInventoryStockSoldPdfBase64 } from "@/lib/inventoryPdf";

function generateSkuBase(value: string) {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ");
  const base = normalized
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 3))
    .join("");
  return base || "ITEM";
}

function digitsOnly(value: string, max = 12) {
  return value.replace(/\D/g, "").slice(0, max);
}

export default function InventoryScreen() {
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

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("0");
  const [cost, setCost] = useState("0");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [skuManual, setSkuManual] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data, error } = await supabase.from("inventory_items").select("*").order("name");
    if (error) return Alert.alert("Error", error.message);
    setItems((data as InventoryItem[]) ?? []);
  }

  async function createItem() {
    const { error } = await supabase.from("inventory_items").insert({
      name,
      sku,
      stock: Number(stock),
      cost: Number(cost)
    });
    if (error) return Alert.alert("Error", error.message);
    setName("");
    setSku("");
    setStock("0");
    setCost("0");
    setSkuManual(false);
    load();
  }

  function handleNameChange(value: string) {
    const limited = value.slice(0, 20);
    setName(limited);
    if (skuManual) return;

    const base = generateSkuBase(limited);
    const sequence = String(items.length + 1).padStart(4, "0");
    setSku(`${base}-${sequence}`);
  }

  function handleSkuChange(value: string) {
    setSku(value);
    setSkuManual(value.trim().length > 0);
  }

  async function openScanner() {
    if (Platform.OS === "web") {
      Alert.alert("Solo movil", "El lector de camara funciona en Android/iOS. En web ingresa el codigo manualmente.");
      return;
    }

    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) {
        Alert.alert("Permiso requerido", "Debes permitir el uso de camara para escanear codigos.");
        return;
      }
    }

    setScanLocked(false);
    setShowScanner(true);
  }

  function onBarcodeScanned({ data }: { data: string }) {
    if (scanLocked) return;
    setScanLocked(true);
    setSku(data);
    setSkuManual(true);
    setShowScanner(false);
    Alert.alert("Codigo detectado", `SKU asignado: ${data}`);
  }

  async function onExportInventoryPdf() {
    if (!items.length) {
      return Alert.alert("Sin datos", "No hay productos en inventario para exportar.");
    }

    const { data: posts, error } = await supabase.from("sales_posts").select("inventory_item_id");
    if (error) return Alert.alert("Error", error.message);

    const soldByItem = new Map<string, number>();
    for (const row of posts ?? []) {
      const id = row.inventory_item_id as string;
      soldByItem.set(id, (soldByItem.get(id) ?? 0) + 1);
    }

    const rows = items.map((item) => ({
      name: item.name,
      stock: item.stock,
      sold: soldByItem.get(item.id) ?? 0
    }));

    try {
      const base64 = buildInventoryStockSoldPdfBase64(rows);
      const filename = `inventario-evalua-${new Date().toISOString().slice(0, 10)}.pdf`;
      const ok = await saveOrSharePdfFromBase64(filename, base64);
      if (!ok) {
        Alert.alert("PDF", "No se pudo preparar el archivo en este dispositivo.");
      }
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo generar el PDF.");
    }
  }

  async function onSignOut() {
    setSignOutLoading(true);
    const { error } = await supabase.auth.signOut();
    setSignOutLoading(false);
    if (error) return Alert.alert("Error", error.message);
    Alert.alert("Sesion", "Sesion cerrada.");
  }

  return (
    <Screen>
      <Card>
        <View style={styles.headerRow}>
          <Link style={[styles.linkBack, { fontFamily: font.bold }]} href="/">
            Volver al inicio
          </Link>
          <Pressable style={styles.smallButton} onPress={load}>
            <Text style={[styles.smallButtonText, { fontFamily: font.semi }]}>Actualizar</Text>
          </Pressable>
          <Pressable style={styles.smallButton} onPress={onExportInventoryPdf}>
            <Text style={[styles.smallButtonText, { fontFamily: font.semi }]}>Descargar PDF</Text>
          </Pressable>
          <Pressable style={[styles.signOutButton, signOutLoading && styles.buttonDisabled]} onPress={onSignOut} disabled={signOutLoading}>
            <Text style={[styles.signOutButtonText, { fontFamily: font.semi }]}>
              {signOutLoading ? "Cerrando..." : "Cerrar sesion"}
            </Text>
          </Pressable>
        </View>
      </Card>
      <Card>
        <Text style={[styles.title, { fontFamily: font.bold }]}>Control de Inventario</Text>
        <Text style={[styles.label, { fontFamily: font.semi }]}>Nombre del producto</Text>
        <TextInput
          style={[styles.input, { fontFamily: font.regular }]}
          placeholder="Ej: Cuaderno universitario"
          placeholderTextColor={theme.colors.muted}
          value={name}
          onChangeText={handleNameChange}
        />

        <Text style={[styles.label, { fontFamily: font.semi }]}>SKU o codigo interno</Text>
        <TextInput
          style={[styles.input, { fontFamily: font.regular }]}
          placeholder="Se genera automatico (editable)"
          placeholderTextColor={theme.colors.muted}
          value={sku}
          onChangeText={handleSkuChange}
        />
        <Pressable style={styles.buttonSecondary} onPress={openScanner}>
          <Text style={[styles.buttonSecondaryText, { fontFamily: font.bold }]}>Escanear codigo de barras con camara</Text>
        </Pressable>
        {showScanner ? (
          <View style={styles.scannerWrap}>
            <CameraView style={styles.scanner} facing="back" barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "code128", "upc_a", "upc_e", "qr"] }} onBarcodeScanned={onBarcodeScanned} />
            <Pressable style={styles.buttonSecondary} onPress={() => setShowScanner(false)}>
              <Text style={[styles.buttonSecondaryText, { fontFamily: font.bold }]}>Cerrar lector</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={[styles.label, { fontFamily: font.semi }]}>Cantidad en stock</Text>
        <TextInput
          style={[styles.input, { fontFamily: font.regular }]}
          placeholder="Ej: 100"
          placeholderTextColor={theme.colors.muted}
          value={stock}
          onChangeText={(value) => setStock(digitsOnly(value))}
          keyboardType="numeric"
        />

        <Text style={[styles.label, { fontFamily: font.semi }]}>Costo unitario (CLP)</Text>
        <TextInput
          style={[styles.input, { fontFamily: font.regular }]}
          placeholder="Ej: 1500"
          placeholderTextColor={theme.colors.muted}
          value={cost}
          onChangeText={(value) => setCost(digitsOnly(value))}
          keyboardType="numeric"
        />
        <Pressable style={styles.button} onPress={createItem}>
          <Text style={[styles.buttonText, { fontFamily: font.bold }]}>Guardar item</Text>
        </Pressable>
      </Card>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card>
            <Text style={[styles.itemName, { fontFamily: font.bold }]}>{item.name}</Text>
            <Text style={[styles.itemMeta, { fontFamily: font.regular }]}>SKU: {item.sku}</Text>
            <Text style={[styles.itemMeta, { fontFamily: font.regular }]}>Stock: {formatIntegerCl(item.stock)}</Text>
            <Text style={[styles.itemMeta, { fontFamily: font.regular }]}>Costo: {formatCurrencyCl(item.cost)}</Text>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  linkBack: { color: theme.colors.secondary, fontWeight: "700" },
  smallButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surfaceAlt
  },
  smallButtonText: { color: theme.colors.text, fontWeight: "600" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 10, color: theme.colors.text },
  label: { fontSize: 13, fontWeight: "600", color: theme.colors.text, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text
  },
  button: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.sm, padding: 12 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "700" },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "rgba(196, 163, 90, 0.1)"
  },
  buttonSecondaryText: { color: theme.colors.secondary, textAlign: "center", fontWeight: "700" },
  signOutButton: {
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.45)",
    borderRadius: theme.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(239, 68, 68, 0.1)"
  },
  signOutButtonText: { color: "#fecaca", textAlign: "center", fontWeight: "700" },
  buttonDisabled: { opacity: 0.6 },
  scannerWrap: { marginBottom: 12 },
  scanner: { width: "100%", height: 260, borderRadius: theme.radius.sm, overflow: "hidden", marginBottom: 10 },
  itemName: { fontWeight: "700", color: theme.colors.text },
  itemMeta: { color: theme.colors.muted, marginTop: 2 }
});
