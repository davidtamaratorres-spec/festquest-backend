import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { authService } from "./services/AuthService";

export default function PartnerAuthScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombreRestaurante, setNombreRestaurante] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  async function handleSubmit() {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      Alert.alert("Datos incompletos", "Ingresa correo y contraseña.");
      return;
    }

    try {
      if (mode === "register") {
        if (!nombreRestaurante.trim() || !ciudad.trim() || !whatsapp.trim()) {
          Alert.alert("Datos incompletos", "Completa todos los campos del restaurante.");
          return;
        }

        await authService.register(
          cleanEmail,
          cleanPassword,
          nombreRestaurante.trim(),
          ciudad.trim(),
          whatsapp.trim()
        );

        Alert.alert("Registro exitoso", "Tu cuenta de socio fue creada.", [
          { text: "Continuar", onPress: () => router.replace("/partner/home") },
        ]);
        return;
      }

      await authService.login(cleanEmail, cleanPassword);
      router.replace("/partner/home");
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "No se pudo validar el acceso.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Acceso para socios</Text>

          <Text style={styles.subtitle}>
            {mode === "login"
              ? "Ingresa con tu correo y contraseña."
              : "Crea una cuenta para administrar tu restaurante y platos."}
          </Text>

          <TextInput
            placeholder="Correo del restaurante"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
          />

          {mode === "register" && (
            <>
              <TextInput
                placeholder="Nombre del restaurante"
                value={nombreRestaurante}
                onChangeText={setNombreRestaurante}
                style={styles.input}
              />
              <TextInput
                placeholder="Ciudad"
                value={ciudad}
                onChangeText={setCiudad}
                style={styles.input}
              />
              <TextInput
                placeholder="WhatsApp (+57 300 000 0000)"
                value={whatsapp}
                onChangeText={setWhatsapp}
                style={styles.input}
                keyboardType="phone-pad"
              />
            </>
          )}

          <Pressable style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>
              {mode === "login" ? "Ingresar" : "Registrarse"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.linkButton}
            onPress={() => setMode(mode === "login" ? "register" : "login")}
          >
            <Text style={styles.linkText}>
              {mode === "login"
                ? "No tengo cuenta. Registrarme"
                : "Ya tengo cuenta. Ingresar"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  scroll: { padding: 24, justifyContent: "center", flexGrow: 1 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 22, borderWidth: 1, borderColor: "#eee" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  subtitle: { color: "#666", marginBottom: 18, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 13, marginBottom: 12, backgroundColor: "#fff" },
  button: { backgroundColor: "#FF6A00", padding: 15, borderRadius: 10, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontWeight: "700" },
  linkButton: { marginTop: 16, alignItems: "center" },
  linkText: { color: "#FF6A00", fontWeight: "600" },
});
