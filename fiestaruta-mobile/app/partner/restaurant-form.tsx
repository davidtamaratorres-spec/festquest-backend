import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";

import { backendPut } from "../services/backendApi";
import { authService } from "./services/AuthService";

export default function RestaurantFormScreen() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saving) return;

    if (!nombre.trim() || !ciudad.trim() || !whatsapp.trim()) {
      Alert.alert("Datos incompletos", "Nombre, ciudad y WhatsApp son obligatorios.");
      return;
    }

    const isLogged = await authService.isLoggedIn();
    if (!isLogged) {
      router.replace("/partner/auth");
      return;
    }

    setSaving(true);
    try {
      await backendPut("/partner/restaurante", {
        nombre: nombre.trim(),
        ciudad: ciudad.trim(),
        direccion: direccion.trim(),
        whatsapp: whatsapp.trim(),
      });

      Alert.alert("Restaurante actualizado", "Los datos fueron guardados correctamente.", [
        { text: "OK", onPress: () => router.replace("/partner/home") },
      ]);
    } catch (e: any) {
      if (e?.message?.includes("401")) {
        await authService.logout();
        router.replace("/partner/auth");
        return;
      }
      Alert.alert("Error", e?.message ?? "No se pudo guardar el restaurante.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Editar restaurante</Text>

      <Text style={styles.label}>Nombre</Text>
      <TextInput
        placeholder="Nombre del restaurante"
        style={styles.input}
        value={nombre}
        onChangeText={setNombre}
      />

      <Text style={styles.label}>Ciudad</Text>
      <TextInput
        placeholder="Ciudad"
        style={styles.input}
        value={ciudad}
        onChangeText={setCiudad}
      />

      <Text style={styles.label}>Dirección</Text>
      <TextInput
        placeholder="Dirección (opcional)"
        style={styles.input}
        value={direccion}
        onChangeText={setDireccion}
      />

      <Text style={styles.label}>WhatsApp</Text>
      <TextInput
        placeholder="+57 300 000 0000"
        style={styles.input}
        value={whatsapp}
        onChangeText={setWhatsapp}
        keyboardType="phone-pad"
      />

      <Pressable
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryText}>Cancelar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  label: { fontSize: 13, color: "#666", marginBottom: 4, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 13,
    marginBottom: 14,
    backgroundColor: "#fafafa",
  },
  button: {
    backgroundColor: "#FF6A00",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryButton: {
    backgroundColor: "#eee",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryText: { fontWeight: "600", color: "#333" },
});
