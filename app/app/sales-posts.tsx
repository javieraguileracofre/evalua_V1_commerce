import { useEffect, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Link } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { supabase } from "@/lib/supabase";
import { SalesPost } from "@/types";
import { theme } from "@/theme";
import { downloadCsv, toCsv } from "@/lib/export";

export default function SalesPostsScreen() {
  const [inventorySku, setInventorySku] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [inventoryName, setInventoryName] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("0");
  const [posts, setPosts] = useState<SalesPost[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data, error } = await supabase.from("sales_posts").select("*").order("created_at", { ascending: false });
    if (error) return Alert.alert("Error", error.message);
    setPosts((data as SalesPost[]) ?? []);
  }

  async function createPost() {
    if (!inventoryItemId) {
      await resolveInventoryBySku(inventorySku);
    }

    if (!inventoryItemId) {
      return Alert.alert("Falta inventario", "Debes ingresar o escanear un SKU valido para publicar.");
    }

    const { error } = await supabase.from("sales_posts").insert({
      inventory_item_id: inventoryItemId,
      title,
      sale_price: Number(price),
      status: "published"
    });
    if (error) return Alert.alert("Error", error.message);
    setInventorySku("");
    setInventoryItemId("");
    setInventoryName("");
    setTitle("");
    setPrice("0");
    load();
  }

  async function resolveInventoryBySku(rawSku: string) {
    const sku = rawSku.trim();
    if (!sku) {
      setInventoryItemId("");
      setInventoryName("");
      return;
    }

    const { data, error } = await supabase.from("inventory_items").select("id,name,sku").eq("sku", sku).maybeSingle();
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    if (!data) {
      setInventoryItemId("");
      setInventoryName("");
      Alert.alert("No encontrado", "No existe un item de inventario con ese SKU.");
      return;
    }

    setInventoryItemId(data.id);
    setInventoryName(data.name);
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

  function onExportSales() {
    const csv = toCsv(
      ["id", "inventory_item_id", "titulo", "precio_venta", "estado"],
      posts.map((post) => [post.id, post.inventory_item_id, post.title, post.sale_price, post.status])
    );
    const downloaded = downloadCsv("ventas.csv", csv);
    if (!downloaded) {
      Alert.alert("Disponible en web", "La descarga CSV esta disponible en la version web del sistema.");
    }
  }

  function onExportReceipt(post: SalesPost) {
    const csv = toCsv(["campo", "valor"], [
      ["id_venta", post.id],
      ["titulo", post.title],
      ["item_id", post.inventory_item_id],
      ["precio", post.sale_price],
      ["estado", post.status]
    ]);
    const downloaded = downloadCsv(`comprobante-venta-${post.id}.csv`, csv);
    if (!downloaded) {
      Alert.alert("Disponible en web", "La descarga del comprobante esta disponible en la version web.");
    }
  }

  return (
    <Screen>
      <Card>
        <View style={styles.headerRow}>
          <Link style={styles.linkBack} href="/">
            Volver al inicio
          </Link>
          <Pressable style={styles.smallButton} onPress={load}>
            <Text style={styles.smallButtonText}>Actualizar</Text>
          </Pressable>
          <Pressable style={styles.smallButton} onPress={onExportSales}>
            <Text style={styles.smallButtonText}>Descargar ventas CSV</Text>
          </Pressable>
        </View>
      </Card>
      <Card>
        <Text style={styles.title}>Post de Venta</Text>
        <Text style={styles.label}>SKU del item en inventario</Text>
        <TextInput
          style={styles.input}
          placeholder="Ingresa o escanea el codigo de barras"
          value={inventorySku}
          onChangeText={(value) => {
            setInventorySku(value);
            setInventoryItemId("");
            setInventoryName("");
          }}
          onBlur={() => resolveInventoryBySku(inventorySku)}
        />
        <Pressable style={styles.buttonSecondary} onPress={openScanner}>
          <Text style={styles.buttonSecondaryText}>Escanear codigo de barras con camara</Text>
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
              <Text style={styles.buttonSecondaryText}>Cerrar lector</Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={styles.helperText}>
          {inventoryItemId ? `Item vinculado: ${inventoryName}` : "Sin item vinculado todavia."}
        </Text>

        <Text style={styles.label}>Titulo de la publicacion</Text>
        <TextInput style={styles.input} placeholder="Ej: Cuaderno universitario 100 hojas" value={title} onChangeText={setTitle} />
        <Text style={styles.label}>Precio de venta (CLP)</Text>
        <TextInput style={styles.input} placeholder="Ej: 2500" value={price} onChangeText={setPrice} keyboardType="numeric" />
        <Pressable style={styles.button} onPress={createPost}>
          <Text style={styles.buttonText}>Publicar</Text>
        </Pressable>
      </Card>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.itemName}>{item.title}</Text>
            <Text style={styles.itemMeta}>Precio: ${item.sale_price}</Text>
            <Text style={styles.itemMeta}>Estado: {item.status}</Text>
            <Pressable style={styles.linkLikeButton} onPress={() => onExportReceipt(item)}>
              <Text style={styles.linkLikeButtonText}>Descargar comprobante</Text>
            </Pressable>
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
    backgroundColor: "#F8FAFC"
  },
  smallButtonText: { color: theme.colors.text, fontWeight: "600" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 10, color: theme.colors.primary },
  label: { fontSize: 13, fontWeight: "600", color: theme.colors.text, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginBottom: 8
  },
  helperText: { color: theme.colors.muted, marginBottom: 10, fontWeight: "600" },
  button: { backgroundColor: theme.colors.success, borderRadius: theme.radius.sm, padding: 12 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "700" },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginBottom: 10
  },
  buttonSecondaryText: { color: theme.colors.primary, textAlign: "center", fontWeight: "700" },
  scannerWrap: { marginBottom: 12 },
  scanner: { width: "100%", height: 260, borderRadius: theme.radius.sm, overflow: "hidden", marginBottom: 10 },
  itemName: { fontWeight: "700", color: theme.colors.text },
  itemMeta: { color: theme.colors.muted, marginTop: 2 },
  linkLikeButton: { marginTop: 8 },
  linkLikeButtonText: { color: theme.colors.secondary, fontWeight: "700" }
});
