import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { backendPut } from "../services/backendApi";
import { authService } from "./services/AuthService";

export default function EditDishScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    nombre: string;
    descripcion: string;
    precio: string;
    categoria: string;
    imagen_url: string;
    disponible: string;
    tiene_descuento: string;
    porcentaje_descuento: string;
    acepta_domicilio: string;
    acepta_reserva: string;
  }>();

  const [name, setName] = useState(params.nombre ?? "");
  const [price, setPrice] = useState(params.precio ?? "");
  const [description, setDescription] = useState(params.descripcion ?? "");
  const [categoria, setCategoria] = useState(params.categoria ?? "");
  const [imagenUrl, setImagenUrl] = useState(params.imagen_url ?? "");
  const [available, setAvailable] = useState(params.disponible !== "0");
  const [tieneDescuento, setTieneDescuento] = useState(params.tiene_descuento === "1");
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(
    params.porcentaje_descuento && params.porcentaje_descuento !== "0"
      ? params.porcentaje_descuento
      : ""
  );
  const [aceptaDomicilio, setAceptaDomicilio] = useState(params.acepta_domicilio === "1");
  const [aceptaReserva, setAceptaReserva] = useState(params.acepta_reserva === "1");
  const [saving, setSaving] = useState(false);

  const id = Number(params.id);

  async function handleSave() {
    Keyboard.dismiss();
    if (saving) return;

    if (!name.trim() || !price.trim()) {
      Alert.alert("Datos incompletos", "Nombre y precio son obligatorios.");
      return;
    }
    const precioNum = Number(price);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      Alert.alert("Precio inválido", "Ingresa un precio numérico válido.");
      return;
    }
    if (tieneDescuento) {
      const pct = Number(porcentajeDescuento);
      if (Number.isNaN(pct) || pct < 1 || pct > 100) {
        Alert.alert("Descuento inválido", "El porcentaje debe estar entre 1 y 100.");
        return;
      }
    }

    const isLogged = await authService.isLoggedIn();
    if (!isLogged) { router.replace("/partner/auth"); return; }

    setSaving(true);
    try {
      await backendPut(`/partner/platos/${id}`, {
        nombre: name.trim(),
        descripcion: description.trim(),
        precio: precioNum,
        categoria: categoria.trim() || "General",
        imagen_url: imagenUrl.trim(),
        disponible: available ? 1 : 0,
        tiene_descuento: tieneDescuento ? 1 : 0,
        porcentaje_descuento: tieneDescuento ? Number(porcentajeDescuento) : 0,
        acepta_domicilio: aceptaDomicilio ? 1 : 0,
        acepta_reserva: aceptaReserva ? 1 : 0,
      });

      Alert.alert("Plato actualizado", "Los cambios fueron guardados.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      if (e?.message?.includes("401")) { await authService.logout(); router.replace("/partner/auth"); return; }
      Alert.alert("Error", e?.message ?? "No se pudo guardar el plato.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Editar plato</Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />

        <Text style={styles.label}>Precio</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />

        <Text style={styles.label}>Descripción</Text>
        <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} multiline />

        <Text style={styles.label}>Categoría</Text>
        <TextInput style={styles.input} value={categoria} onChangeText={setCategoria} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />

        <Text style={styles.label}>URL de imagen</Text>
        <TextInput style={styles.input} value={imagenUrl} onChangeText={setImagenUrl} autoCapitalize="none" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />

        <View style={styles.divider} />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Disponible</Text>
          <Switch value={available} onValueChange={setAvailable} trackColor={{ true: "#FF6A00" }} />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>💸 Tiene descuento</Text>
          </View>
          <Switch value={tieneDescuento} onValueChange={setTieneDescuento} trackColor={{ true: "#FF6A00" }} />
        </View>
        {tieneDescuento && (
          <TextInput
            placeholder="Porcentaje de descuento (ej: 20)"
            style={styles.input}
            keyboardType="numeric"
            value={porcentajeDescuento}
            onChangeText={setPorcentajeDescuento}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
        )}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>🛵 Acepta domicilio</Text>
          <Switch value={aceptaDomicilio} onValueChange={setAceptaDomicilio} trackColor={{ true: "#FF6A00" }} />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>📅 Acepta reserva</Text>
          <Switch value={aceptaReserva} onValueChange={setAceptaReserva} trackColor={{ true: "#FF6A00" }} />
        </View>

        <View style={styles.divider} />

        <Pressable style={[styles.button, saving && styles.buttonDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? "Guardando..." : "Guardar cambios"}</Text>
        </Pressable>

        <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 18 },
  label: { fontSize: 13, color: "#666", fontWeight: "600", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 13, marginBottom: 14, backgroundColor: "#fafafa" },
  textarea: { height: 90, textAlignVertical: "top" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 12 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  switchInfo: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 15, color: "#111", fontWeight: "500" },
  button: { backgroundColor: "#FF6A00", padding: 16, borderRadius: 10, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelBtn: { backgroundColor: "#eee", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 10, marginBottom: 20 },
  cancelText: { fontWeight: "600", color: "#333" },
});
