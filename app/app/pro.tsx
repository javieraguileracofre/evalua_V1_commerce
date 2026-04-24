import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts
} from "@expo-google-fonts/plus-jakarta-sans";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme";

export default function ProScreen() {
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

  async function onSignOut() {
    const { error } = await supabase.auth.signOut();
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
          <Text style={[styles.title, { fontFamily: font.bold }]}>Version PRO</Text>
        </View>
        <Text style={[styles.subtitle, { fontFamily: font.regular }]}>
          Acceso a utilidades de analisis y gestion avanzada.
        </Text>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { fontFamily: font.bold }]}>Accesos PRO</Text>
        <Link href="/pro-masters" asChild>
          <Pressable style={styles.button}>
            <Text style={[styles.buttonText, { fontFamily: font.bold }]}>Clientes y proveedores (maestros)</Text>
          </Pressable>
        </Link>
        <Link href="/quick-results" asChild>
          <Pressable style={styles.buttonSecondary}>
            <Text style={[styles.buttonText, { fontFamily: font.bold }]}>Resultados rapidos</Text>
          </Pressable>
        </Link>
        <Link href="/inventory" asChild>
          <Pressable style={styles.buttonSecondary}>
            <Text style={[styles.buttonSecondaryText, { fontFamily: font.bold }]}>Inventario</Text>
          </Pressable>
        </Link>
      </Card>

      <Card>
        <Pressable style={styles.signOutButton} onPress={onSignOut}>
          <Text style={[styles.signOutText, { fontFamily: font.semi }]}>Cerrar sesion</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  linkBack: { color: theme.colors.secondary, fontWeight: "700" },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: "700" },
  subtitle: { color: theme.colors.muted, marginTop: 10, fontSize: 13 },
  sectionTitle: { color: theme.colors.text, fontSize: 18, marginBottom: 8 },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10
  },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "700" },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(196, 163, 90, 0.1)"
  },
  buttonSecondaryText: { color: theme.colors.secondary, textAlign: "center", fontWeight: "700" },
  signOutButton: {
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.45)",
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)"
  },
  signOutText: { color: "#fecaca", textAlign: "center", fontWeight: "700" }
});
