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
import { SalesPost } from "@/types";
import { theme } from "@/theme";
import { saveOrSharePdfFromBase64 } from "@/lib/export";
import { formatCurrencyCl, formatIntegerCl } from "@/lib/format";
import { buildSaleReceiptPdfDataUri, buildSalesPdfDataUri } from "@/lib/salesPdf";

function digitsOnly(value: string, max = 12) {
  return value.replace(/\D/g, "").slice(0, max);
}

export default function SalesPostsScreen() {
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

  type InventoryOption = { id: string; name: string; sku: string; stock: number };

  const [inventorySku, setInventorySku] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [inventoryName, setInventoryName] = useState("");
  const [inventoryStock, setInventoryStock] = useState<number | null>(null);
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("0");
  const [posts, setPosts] = useState<SalesPost[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data, error } = await supabase.from("sales_posts").select("*").order("created_at", { ascending: false });
    if (error) return Alert.alert("Error", error.message);
    setPosts((data as SalesPost[]) ?? []);
    await loadInventoryOptions();
  }

  async function loadInventoryOptions() {
    const { data, error } = await supabase.from("inventory_items").select("id,name,sku,stock").order("name");
    if (error) return Alert.alert("Error", error.message);
    setInventoryOptions((data as InventoryOption[]) ?? []);
  }

  async function createPost() {
    let selectedId = inventoryItemId;
    let selectedStock = inventoryStock;
    if (!selectedId) {
      const resolved = await resolveInventoryBySku(inventorySku);
      if (resolved) {
        selectedId = resolved.id;
        selectedStock = resolved.stock;
      }
    }

    if (!selectedId) {
      return Alert.alert("Falta inventario", "Debes ingresar o escanear un SKU valido para publicar.");
    }

    if ((selectedStock ?? 0) <= 0) {
      return Alert.alert("Sin stock", "Este producto tiene stock 0. Debes comprar y abastecerte antes de publicar una venta.");
    }

    const { error } = await supabase.from("sales_posts").insert({
      inventory_item_id: selectedId,
      title,
      sale_price: Number(price),
      status: "published"
    });
    if (error) return Alert.alert("Error", error.message);
    setInventorySku("");
    setInventoryItemId("");
    setInventoryName("");
    setInventoryStock(null);
    setInventorySearch("");
    setTitle("");
    setPrice("0");
    load();
  }

  async function resolveInventoryBySku(rawSku: string) {
    const sku = rawSku.trim();
    if (!sku) {
      setInventoryItemId("");
      setInventoryName("");
      setInventoryStock(null);
      return null;
    }

    const { data, error } = await supabase.from("inventory_items").select("id,name,sku,stock").eq("sku", sku).maybeSingle();
    if (error) {
      Alert.alert("Error", error.message);
      return null;
    }

    if (!data) {
      setInventoryItemId("");
      setInventoryName("");
      setInventoryStock(null);
      Alert.alert("No encontrado", "No existe un item de inventario con ese SKU.");
      return null;
    }

    setInventoryItemId(data.id);
    setInventoryName(data.name);
    setInventoryStock(data.stock);
    setInventorySearch(data.name);
    return data as InventoryOption;
  }

  function selectInventory(item: InventoryOption) {
    setInventoryItemId(item.id);
    setInventoryName(item.name);
    setInventorySku(item.sku);
    setInventoryStock(item.stock);
    setInventorySearch(item.name);
  }

  async function openScanner() {
    if (Platform.OS === "web") {
      Alert.alert("Solo movil", "El lector de camara funciona en Android/iOS. En web ingresa el SKU manualmente.");
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
    setInventorySku(data);
    setShowScanner(false);
    resolveInventoryBySku(data);
  }

  const filteredInventory = inventoryOptions
    .filter((item) => {
      const query = inventorySearch.trim().toLowerCase();
      if (!query) return true;
      return item.name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query);
    })
    .slice(0, 8);

  async function onExportSalesPdf() {
    if (!posts.length) {
      return Alert.alert("Sin datos", "No hay publicaciones de venta para exportar.");
    }

    try {
      const dataUri = buildSalesPdfDataUri(
        posts.map((post) => ({
          title: post.title,
          price: post.sale_price,
          status: post.status
        }))
      );
      const filename = `ventas-evalua-${new Date().toISOString().slice(0, 10)}.pdf`;
      const ok = await saveOrSharePdfFromBase64(filename, dataUri);
      if (!ok) Alert.alert("PDF", "No se pudo preparar el archivo en este dispositivo.");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo generar el PDF.");
    }
  }

  async function onExportReceipt(post: SalesPost) {
    try {
      const dataUri = buildSaleReceiptPdfDataUri({
        id: post.id,
        title: post.title,
        inventoryItemId: post.inventory_item_id,
        salePrice: post.sale_price,
        status: post.status
      });
      const ok = await saveOrSharePdfFromBase64(`comprobante-venta-${post.id}.pdf`, dataUri);
      if (!ok) Alert.alert("PDF", "No se pudo preparar el comprobante en este dispositivo.");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo generar el comprobante.");
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
          <Link style={[styles.linkBack, { fontFamily: font.bold }]} href="/modules">
            Volver a modulos
          </Link>
          <Pressable style={styles.smallButton} onPress={load}>
            <Text style={[styles.smallButtonText, { fontFamily: font.semi }]}>Actualizar</Text>
          </Pressable>
          <Pressable style={styles.smallButton} onPress={onExportSalesPdf}>
            <Text style={[styles.smallButtonText, { fontFamily: font.semi }]}>Descargar ventas PDF</Text>
          </Pressable>
          <Pressable style={[styles.signOutButton, signOutLoading && styles.buttonDisabled]} onPress={onSignOut} disabled={signOutLoading}>
            <Text style={[styles.signOutButtonText, { fontFamily: font.semi }]}>
              {signOutLoading ? "Cerrando..." : "Cerrar sesion"}
            </Text>
          </Pressable>
        </View>
      </Card>
      <Card>
        <Text style={[styles.quickAccessTitle, { fontFamily: font.bold }]}>Modulos Free</Text>
        <Text style={[styles.quickAccessSubtitle, { fontFamily: font.regular }]}>
          Accesos directos a venta, inventario y resultados.
        </Text>
        <View style={styles.quickAccessRow}>
          <Link href="/sales-posts" asChild>
            <Pressable style={styles.quickAccessButton}>
              <Text style={[styles.quickAccessButtonText, { fontFamily: font.bold }]}>Venta</Text>
            </Pressable>
          </Link>
          <Link href="/inventory" asChild>
            <Pressable style={styles.quickAccessButton}>
              <Text style={[styles.quickAccessButtonText, { fontFamily: font.bold }]}>Inventario</Text>
            </Pressable>
          </Link>
          <Link href="/quick-results" asChild>
            <Pressable style={styles.quickAccessButton}>
              <Text style={[styles.quickAccessButtonText, { fontFamily: font.bold }]}>Resultados</Text>
            </Pressable>
          </Link>
        </View>
      </Card>
      <Card>
        <Text style={[styles.title, { fontFamily: font.bold }]}>Post de Venta</Text>
        <Text style={[styles.label, { fontFamily: font.semi }]}>SKU del item en inventario</Text>
        <TextInput
          style={[styles.input, { fontFamily: font.regular }]}
          placeholder="Ingresa o escanea el codigo de barras"
          placeholderTextColor={theme.colors.muted}
          value={inventorySku}
          onChangeText={(value) => {
            setInventorySku(value);
            setInventoryItemId("");
            setInventoryName("");
          }}
          onBlur={() => resolveInventoryBySku(inventorySku)}
        />
        <Pressable style={styles.buttonSecondary} onPress={openScanner}>
          <Text style={[styles.buttonSecondaryText, { fontFamily: font.bold }]}>Escanear codigo de barras con camara</Text>
        </Pressable>
        {showScanner ? (
          <View style={styles.scannerWrap}>
            <CameraView
              style={styles.scanner}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "code128", "upc_a", "upc_e", "qr"] }}
              onBarcodeScanned={onBarcodeScanned}
            />
            <Pressable style={styles.buttonSecondary} onPress={() => setShowScanner(false)}>
              <Text style={[styles.buttonSecondaryText, { fontFamily: font.bold }]}>Cerrar lector</Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={[styles.label, { fontFamily: font.semi }]}>Buscar y seleccionar inventario disponible</Text>
        <TextInput
          style={[styles.input, { fontFamily: font.regular }]}
          placeholder="Buscar por nombre o SKU"
          placeholderTextColor={theme.colors.muted}
          value={inventorySearch}
          onChangeText={(value) => {
            setInventorySearch(value);
            setInventoryItemId("");
            setInventoryName("");
            setInventoryStock(null);
          }}
        />
        <View style={styles.searchResultsWrap}>
          {filteredInventory.map((item) => (
            <Pressable key={item.id} style={styles.resultRow} onPress={() => selectInventory(item)}>
              <Text style={[styles.resultTitle, { fontFamily: font.bold }]}>{item.name}</Text>
              <Text style={[styles.resultMeta, item.stock <= 0 && styles.stockDanger, { fontFamily: font.regular }]}>
                SKU: {item.sku} · Stock: {formatIntegerCl(item.stock)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.helperText, { fontFamily: font.semi }]}>
          {inventoryItemId
            ? `Item vinculado: ${inventoryName}${inventoryStock != null ? ` (stock: ${formatIntegerCl(inventoryStock)})` : ""}`
            : "Sin item vinculado todavia."}
        </Text>
        {inventoryStock != null && inventoryStock <= 0 ? (
          <Text style={[styles.stockWarning, { fontFamily: font.bold }]}>Stock actual en 0. Debes comprar y abastecerte antes de vender.</Text>
        ) : null}

        <Text style={[styles.label, { fontFamily: font.semi }]}>Titulo de la publicacion</Text>
        <TextInput
          style={[styles.input, { fontFamily: font.regular }]}
          placeholder="Ej: Cuaderno universitario 100 hojas"
          placeholderTextColor={theme.colors.muted}
          value={title}
          onChangeText={setTitle}
        />
        <Text style={[styles.label, { fontFamily: font.semi }]}>Precio de venta (CLP)</Text>
        <TextInput
          style={[styles.input, { fontFamily: font.regular }]}
          placeholder="Ej: 2500"
          placeholderTextColor={theme.colors.muted}
              value={price}
              onChangeText={(value) => setPrice(digitsOnly(value))}
          keyboardType="numeric"
        />
        <Pressable style={styles.button} onPress={createPost}>
          <Text style={[styles.buttonText, { fontFamily: font.bold }]}>Publicar</Text>
        </Pressable>
      </Card>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card>
            <Text style={[styles.itemName, { fontFamily: font.bold }]}>{item.title}</Text>
            <Text style={[styles.itemMeta, { fontFamily: font.regular }]}>Precio: {formatCurrencyCl(item.sale_price)}</Text>
            <Text style={[styles.itemMeta, { fontFamily: font.regular }]}>Estado: {item.status}</Text>
            <Pressable style={styles.linkLikeButton} onPress={() => onExportReceipt(item)}>
              <Text style={[styles.linkLikeButtonText, { fontFamily: font.bold }]}>Descargar comprobante PDF</Text>
            </Pressable>
          </Card>
        )}
        ListEmptyComponent={
          <Card>
            <Text style={[styles.itemMeta, { fontFamily: font.regular }]}>No hay publicaciones registradas.</Text>
          </Card>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  linkBack: { color: theme.colors.secondary, fontWeight: "700" },
  quickAccessTitle: { color: theme.colors.text, fontSize: 16, marginBottom: 4, fontWeight: "700" },
  quickAccessSubtitle: { color: theme.colors.muted, marginBottom: 10, fontSize: 12 },
  quickAccessRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickAccessButton: {
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    borderRadius: theme.radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(196, 163, 90, 0.1)"
  },
  quickAccessButtonText: { color: theme.colors.secondary, textAlign: "center", fontWeight: "700", fontSize: 12 },
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
  helperText: { color: theme.colors.muted, marginBottom: 10, fontWeight: "600" },
  searchResultsWrap: { marginBottom: 8 },
  resultRow: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 8,
    marginBottom: 6,
    backgroundColor: theme.colors.surfaceAlt
  },
  resultTitle: { color: theme.colors.text, fontWeight: "700" },
  resultMeta: { color: theme.colors.muted, marginTop: 2 },
  stockDanger: { color: theme.colors.danger, fontWeight: "700" },
  stockWarning: { color: theme.colors.danger, fontWeight: "700", marginBottom: 10 },
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
  itemMeta: { color: theme.colors.muted, marginTop: 2 },
  linkLikeButton: { marginTop: 8 },
  linkLikeButtonText: { color: theme.colors.secondary, fontWeight: "700" }
});
