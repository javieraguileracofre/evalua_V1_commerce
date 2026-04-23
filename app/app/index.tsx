import { useEffect, useState } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { theme } from "@/theme";

export default function IndexScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function showError(message: string) {
    setFeedback({ type: "error", text: message });
  }

  function showSuccess(message: string) {
    setFeedback({ type: "success", text: message });
  }

  function formatAuthError(message: string) {
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
    supabase.auth.getUser().then(({ data }) => {
      setSessionEmail(data.user?.email ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function onSignUp() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return showError("Ingresa un correo.");
    if (password.length < 6) return showError("La contrasena debe tener al menos 6 caracteres.");

    setFeedback(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email: normalizedEmail, password });
    setLoading(false);

    if (error) return showError(formatAuthError(error.message));
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

    if (error) return showError(formatAuthError(error.message));
    showSuccess("Si el correo existe, Supabase enviara el enlace de recuperacion.");
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Evalua V1 Commerce</Text>
        <Text style={styles.subtitle}>Diseno inspirado en evalua_V1</Text>
      </Card>

      {!sessionEmail ? (
        <Card>
          <TextInput
            style={styles.input}
            placeholder="Correo"
            autoCapitalize="none"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (feedback) setFeedback(null);
            }}
          />
          <TextInput
            style={styles.input}
            placeholder="Contrasena"
            secureTextEntry
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (feedback) setFeedback(null);
            }}
          />
          {feedback ? (
            <View style={[styles.feedbackBox, feedback.type === "error" ? styles.errorBox : styles.successBox]}>
              <Text style={feedback.type === "error" ? styles.errorText : styles.successText}>{feedback.text}</Text>
            </View>
          ) : null}
          <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={onSignIn} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Procesando..." : "Ingresar"}</Text>
          </Pressable>
          <Pressable style={[styles.buttonSecondary, loading && styles.buttonDisabled]} onPress={onSignUp} disabled={loading}>
            <Text style={styles.secondaryText}>Crear cuenta</Text>
          </Pressable>
          <Pressable onPress={onRecover} disabled={loading}>
            <Text style={styles.link}>Recuperar por correo</Text>
          </Pressable>
        </Card>
      ) : (
        <Card>
          <Text style={styles.subtitle}>Sesion activa: {sessionEmail}</Text>
          <Link style={styles.link} href="/inventory">
            Ir a inventario
          </Link>
          <Link style={styles.link} href="/sales-posts">
            Ir a publicaciones de venta
          </Link>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.primary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: theme.colors.muted, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginBottom: 10,
    backgroundColor: theme.colors.surface
  },
  feedbackBox: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10
  },
  errorBox: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2"
  },
  successBox: {
    borderColor: "#22c55e",
    backgroundColor: "#f0fdf4"
  },
  errorText: { color: "#b91c1c", fontWeight: "600" },
  successText: { color: "#15803d", fontWeight: "600" },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: theme.radius.sm,
    marginBottom: 10
  },
  buttonText: { color: "white", textAlign: "center", fontWeight: "700" },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    padding: 12,
    borderRadius: theme.radius.sm,
    marginBottom: 10
  },
  buttonDisabled: { opacity: 0.6 },
  secondaryText: { color: theme.colors.primary, textAlign: "center", fontWeight: "700" },
  link: { color: theme.colors.secondary, marginTop: 8, fontWeight: "600" }
});
