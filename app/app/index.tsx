import type { ComponentProps } from "react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold
} from "@expo-google-fonts/plus-jakarta-sans";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

/** Tokens from Evalua_V1 `templates/auth/login.html` */
const pv = {
  navy: "#060b14",
  navyMid: "#0c1629",
  gold: "#c4a35a",
  text: "#e8eef8",
  muted: "#8b95ab",
  panel: "rgba(15, 23, 42, 0.88)",
  inputBg: "rgba(15, 23, 42, 0.98)",
  borderSoft: "rgba(148, 163, 184, 0.18)",
  slateLine: "#6b7a90"
};

const WIDE_BREAKPOINT = 992;

function BrandMark({ compact }: { compact?: boolean }) {
  return (
    <LinearGradient
      colors={["#ead8ab", pv.gold]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.brandMark, compact && styles.brandMarkCompact]}
    >
      <Text style={[styles.brandMarkLetter, compact && styles.brandMarkLetterCompact]}>E</Text>
    </LinearGradient>
  );
}

function Pill({ icon, label }: { icon: ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string }) {
  return (
    <View style={styles.pill}>
      <MaterialCommunityIcons name={icon} size={13} color={pv.gold} />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

export default function IndexScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [emailCooldownSec, setEmailCooldownSec] = useState(0);

  const text = useMemo(
    () => ({
      regular: "PlusJakartaSans_400Regular" as const,
      semi: "PlusJakartaSans_600SemiBold" as const,
      bold: "PlusJakartaSans_700Bold" as const,
      extra: "PlusJakartaSans_800ExtraBold" as const
    }),
    []
  );

  function showError(message: string) {
    setFeedback({ type: "error", text: message });
  }

  function showSuccess(message: string) {
    setFeedback({ type: "success", text: message });
  }

  function formatAuthError(message: string) {
    if (message.toLowerCase().includes("email rate limit exceeded")) {
      return "Se alcanzo el limite de correos por ahora. Espera unos minutos y vuelve a intentarlo.";
    }
    if (message.toLowerCase().includes("invalid api key")) {
      return [
        "Clave API invalida.",
        "En Supabase: Project Settings > API Keys > pestaña «Legacy anon, service_role».",
        "Copia la clave «anon» (muy larga, empieza con eyJ) y pegala en app/.env como:",
        "EXPO_PUBLIC_SUPABASE_ANON_JWT=tu_clave_aqui",
        "O reemplaza el valor de EXPO_PUBLIC_SUPABASE_ANON_KEY por esa misma clave.",
        "Actualiza el mismo valor en GitHub > Settings > Secrets (Actions) y ejecuta npx expo start --clear."
      ].join(" ");
    }
    return message;
  }

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let unsubscribe: (() => void) | null = null;
    const initTimer = setTimeout(async () => {
      const { data } = await supabase.auth.getUser();
      startTransition(() => {
        setSessionEmail(data.user?.email ?? null);
        setAuthChecked(true);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        startTransition(() => {
          setSessionEmail(session?.user?.email ?? null);
        });
      });
      unsubscribe = () => authListener.subscription.unsubscribe();
    }, 0);

    return () => {
      clearTimeout(initTimer);
      if (unsubscribe) unsubscribe();
    };
  }, [hydrated]);

  useEffect(() => {
    if (emailCooldownSec <= 0) return;
    const timer = setInterval(() => {
      setEmailCooldownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [emailCooldownSec]);

  async function onSignUp() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return showError("Ingresa un correo.");
    if (password.length < 6) return showError("La contrasena debe tener al menos 6 caracteres.");

    setFeedback(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email: normalizedEmail, password });
    setLoading(false);

    if (error) {
      const msg = formatAuthError(error.message);
      if (error.message.toLowerCase().includes("email rate limit exceeded")) {
        setEmailCooldownSec(60);
      }
      return showError(msg);
    }
    setEmailCooldownSec(60);
    showSuccess("Cuenta creada. Revisa tu correo para confirmar.");
  }

  async function onSignIn() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return showError("Ingresa un correo.");
    if (!password) return showError("Ingresa tu contrasena.");

    setFeedback(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    setLoading(false);

    if (error) return showError(formatAuthError(error.message));
    setSessionEmail(data.user.email ?? null);
    showSuccess("Sesion iniciada.");
  }

  async function onRecover() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return showError("Ingresa tu correo para recuperar cuenta.");

    setFeedback(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
    setLoading(false);

    if (error) {
      const msg = formatAuthError(error.message);
      if (error.message.toLowerCase().includes("email rate limit exceeded")) {
        setEmailCooldownSec(60);
      }
      return showError(msg);
    }
    setEmailCooldownSec(60);
    showSuccess("Si el correo existe, Supabase enviara el enlace de recuperacion.");
  }

  async function onSignOut() {
    setFeedback(null);
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) return showError(formatAuthError(error.message));
    setSessionEmail(null);
    showSuccess("Sesion cerrada.");
  }

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={["#0a1220", pv.navyMid, "#070d18"]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.fontLoading}>
          <ActivityIndicator color={pv.gold} size="large" />
        </View>
      </View>
    );
  }

  const font = fontError
    ? { regular: undefined, semi: undefined, bold: undefined, extra: undefined }
    : text;

  const brandColumn = (
    <ScrollView style={styles.brandColumn} contentContainerStyle={styles.brandColumnContent} showsVerticalScrollIndicator={false}>
      <View style={styles.brandGlowGold} pointerEvents="none" />
      <View style={styles.brandGlowCyan} pointerEvents="none" />
      <View style={styles.brandInner}>
        <View>
          <BrandMark />
          <Text style={[styles.brandH1, { fontFamily: font.extra }]}>Evalua ERP</Text>
          <Text style={[styles.leadBrand, { fontFamily: font.regular }]}>
            Suite empresarial unificada para operaciones, finanzas, inventario, cobranza y control. Diseñada para organizaciones que necesitan trazabilidad, orden y ejecución con estándar corporativo.
          </Text>
          <View style={styles.pillRow}>
            <Pill icon="shield-lock-outline" label="Sesión segura" />
            <Pill icon="view-grid-outline" label="Arquitectura modular" />
            <Pill icon="domain" label="Gestión empresarial" />
          </View>
        </View>
        <Text style={[styles.brandFooter, { fontFamily: font.regular }]}>
          © Evalua ERP · Acceso restringido a personal autorizado
        </Text>
      </View>
    </ScrollView>
  );

  const loginCard = (
    <View style={styles.loginCard}>
      {!isWide ? (
        <View style={styles.mobileBrand}>
          <BrandMark compact />
          <Text style={[styles.mobileBrandTitle, { fontFamily: font.extra }]}>Evalua ERP</Text>
        </View>
      ) : null}

      <Text style={[styles.cardH2, { fontFamily: font.extra }]}>Acceso corporativo</Text>
      <Text style={[styles.cardSub, { fontFamily: font.regular }]}>
        Ingrese sus credenciales para continuar al entorno de gestión.
      </Text>

      {!authChecked ? (
        <Text style={[styles.loadingHint, { fontFamily: font.regular }]}>Verificando sesión…</Text>
      ) : !sessionEmail ? (
        <>
          {feedback ? (
            <View
              style={[
                styles.alert,
                feedback.type === "error" ? styles.alertDanger : styles.alertSuccess
              ]}
            >
              <MaterialCommunityIcons
                name={feedback.type === "error" ? "alert-octagon-outline" : "check-circle-outline"}
                size={16}
                color={feedback.type === "error" ? "#ffd6db" : "#b6f5d4"}
                style={styles.alertIcon}
              />
              <Text
                style={[
                  styles.alertText,
                  { fontFamily: font.regular },
                  feedback.type === "error" ? styles.alertTextDanger : styles.alertTextSuccess
                ]}
              >
                {feedback.text}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.formLabel, { fontFamily: font.extra }]}>Correo corporativo</Text>
          <TextInput
            style={[styles.formControl, { fontFamily: font.regular }]}
            placeholder="nombre@empresa.cl"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (feedback) setFeedback(null);
            }}
          />

          <Text style={[styles.formLabel, { fontFamily: font.extra }]}>Contraseña</Text>
          <TextInput
            style={[styles.formControl, styles.formControlLast, { fontFamily: font.regular }]}
            placeholder="••••••••••••"
            placeholderTextColor="#64748b"
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (feedback) setFeedback(null);
            }}
          />

          <Pressable disabled={loading} onPress={onSignIn} style={({ pressed }) => [pressed && !loading && styles.btnPressLift]}>
            <LinearGradient
              colors={["#1f4168", "#162f4d"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.btnLogin, loading && styles.btnDisabled]}
            >
              <MaterialCommunityIcons name="login-variant" size={18} color="#f8fafc" />
              <Text style={[styles.btnLoginText, { fontFamily: font.extra }]}>
                {loading ? "Procesando…" : "Entrar al sistema"}
              </Text>
            </LinearGradient>
          </Pressable>

          <View style={styles.extraRow}>
            <Pressable onPress={onSignUp} disabled={loading}>
              <Text style={[styles.extraLink, { fontFamily: font.semi }]}>
                {emailCooldownSec > 0 ? `Crear cuenta (${emailCooldownSec}s)` : "Crear cuenta"}
              </Text>
            </Pressable>
            <Text style={[styles.extraDot, { fontFamily: font.regular }]}> · </Text>
            <Pressable onPress={onRecover} disabled={loading || emailCooldownSec > 0}>
              <Text style={[styles.extraLink, (loading || emailCooldownSec > 0) && styles.extraLinkDisabled, { fontFamily: font.semi }]}>
                {emailCooldownSec > 0 ? `Recuperar (${emailCooldownSec}s)` : "Recuperar acceso"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.securityNote}>
            <MaterialCommunityIcons name="information-outline" size={16} color={pv.gold} style={styles.securityIcon} />
            <Text style={[styles.securityText, { fontFamily: font.regular }]}>
              Si olvidó su clave, contacte al administrador de su organización. Los accesos al sistema pueden quedar registrados para control y auditoría.
            </Text>
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.sessionLabel, { fontFamily: font.regular }]}>Sesión activa</Text>
          <Text style={[styles.sessionEmail, { fontFamily: font.semi }]}>{sessionEmail}</Text>
          <Link style={[styles.sessionLink, { fontFamily: font.extra }]} href="/inventory">
            Ir a inventario
          </Link>
          <Link style={[styles.sessionLink, { fontFamily: font.extra }]} href="/sales-posts">
            Ir a publicaciones de venta
          </Link>
          <Link style={[styles.sessionLink, { fontFamily: font.extra }]} href="/quick-results">
            Ir a resultados rapidos
          </Link>
          <Pressable
            style={[styles.signOutButton, loading && styles.btnDisabled]}
            onPress={onSignOut}
            disabled={loading}
          >
            <Text style={[styles.signOutButtonText, { fontFamily: font.extra }]}>
              {loading ? "Cerrando..." : "Cerrar sesion"}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );

  const panelBody = (
    <LinearGradient colors={["#0b1220", pv.navy]} style={styles.loginPanel}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.panelScroll, !isWide && styles.panelScrollNarrow]}
        showsVerticalScrollIndicator={false}
      >
        {loginCard}
      </ScrollView>
    </LinearGradient>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
          {isWide ? (
            <View style={styles.shellRow}>
              <View style={styles.brandWrap}>
                <LinearGradient
                  colors={["#0a1220", pv.navyMid, "#070d18"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.35, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                {brandColumn}
              </View>
              <View style={[styles.panelWrap, { flex: 0.92 }]}>{panelBody}</View>
            </View>
          ) : (
            <View style={styles.shellCol}>{panelBody}</View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: pv.navy },
  fontLoading: { flex: 1, justifyContent: "center", alignItems: "center" },
  safe: { flex: 1, backgroundColor: pv.navy },
  keyboard: { flex: 1 },
  shellRow: { flex: 1, flexDirection: "row" },
  shellCol: { flex: 1 },
  brandWrap: {
    flex: 1.08,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.06)",
    overflow: "hidden"
  },
  brandColumn: { flex: 1, backgroundColor: "transparent" },
  brandColumnContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 36,
    paddingVertical: 40,
    minHeight: "100%"
  },
  brandGlowGold: {
    position: "absolute",
    width: 320,
    height: 280,
    borderRadius: 160,
    backgroundColor: "rgba(196, 163, 90, 0.22)",
    top: -80,
    right: -100
  },
  brandGlowCyan: {
    position: "absolute",
    width: 260,
    height: 200,
    borderRadius: 120,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    bottom: -40,
    left: -80
  },
  brandInner: { flex: 1, justifyContent: "space-between", zIndex: 1 },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    shadowColor: pv.gold,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10
  },
  brandMarkCompact: {
    width: 42,
    height: 42,
    borderRadius: 14,
    marginBottom: 0
  },
  brandMarkLetter: {
    fontSize: 23,
    fontWeight: "800",
    color: pv.navy
  },
  brandMarkLetterCompact: { fontSize: 17 },
  brandH1: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 12,
    color: "#f8fafc"
  },
  leadBrand: {
    color: pv.muted,
    fontSize: 15,
    lineHeight: 26,
    maxWidth: 496
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 28
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)"
  },
  pillText: {
    color: "#d4dceb",
    fontSize: 12,
    fontWeight: "700"
  },
  brandFooter: {
    marginTop: 32,
    fontSize: 12,
    color: pv.slateLine
  },
  panelWrap: { minWidth: 0 },
  loginPanel: { flex: 1, minHeight: "100%" },
  panelScroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 24
  },
  panelScrollNarrow: {
    paddingVertical: 20,
    paddingHorizontal: 16
  },
  loginCard: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 28,
    backgroundColor: pv.panel,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.14)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.45,
    shadowRadius: 40,
    elevation: 16
  },
  mobileBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 14
  },
  mobileBrandTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f8fafc",
    letterSpacing: -0.3
  },
  cardH2: {
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 6,
    color: "#f8fafc"
  },
  cardSub: {
    fontSize: 14,
    color: pv.muted,
    marginBottom: 22,
    lineHeight: 22
  },
  loadingHint: {
    fontSize: 14,
    color: pv.muted
  },
  formLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "800",
    color: "#94a3b8",
    marginBottom: 6
  },
  formControl: {
    backgroundColor: pv.inputBg,
    borderWidth: 1,
    borderColor: pv.borderSoft,
    color: "#f1f5f9",
    borderRadius: 13,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 18
  },
  formControlLast: {
    marginBottom: 20
  },
  alert: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 8
  },
  alertDanger: {
    backgroundColor: "rgba(220, 53, 69, 0.16)"
  },
  alertSuccess: {
    backgroundColor: "rgba(25, 135, 84, 0.16)"
  },
  alertIcon: { marginTop: 1 },
  alertText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19
  },
  alertTextDanger: { color: "#ffd6db" },
  alertTextSuccess: { color: "#d5ffea" },
  btnLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#1e3a5f",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6
  },
  btnLoginText: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "800"
  },
  btnDisabled: { opacity: 0.55 },
  btnPressLift: {
    transform: [{ translateY: -1 }]
  },
  extraRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 6,
    gap: 2
  },
  extraLink: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600"
  },
  extraLinkDisabled: { opacity: 0.45 },
  extraDot: { color: "#64748b", fontSize: 13 },
  securityNote: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  securityIcon: { marginTop: 2 },
  securityText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#6d7a8f"
  },
  sessionLabel: {
    fontSize: 13,
    color: pv.muted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  sessionEmail: {
    fontSize: 15,
    color: pv.text,
    marginBottom: 18
  },
  sessionLink: {
    color: pv.gold,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 10
  },
  signOutButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.45)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "rgba(239, 68, 68, 0.1)"
  },
  signOutButtonText: {
    color: "#fecaca",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center"
  }
});
