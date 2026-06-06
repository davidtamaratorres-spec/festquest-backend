import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    Alert,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from "react-native";

import { createBackendDish } from "../services/backendDishes";

export default function NewDishScreen() {
  const router = useRouter();

  const [restauranteId, setRestauranteId] = useState("1");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoria, setCategoria] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(() => {
    const rid = Number(restauranteId);
    const p = Number(precio);
    return (
      !saving &&
      Number.isFinite(rid) &&
      rid > 0 &&
      nombre.trim().length > 0 &&
      Number.isFinite(p) &&
      p >= 0
    );
  }, [restauranteId, nombre, precio, saving]);

  async function onSave() {
    try {
      setSaving(true);

      await createBackendDish({
        restaurante_id: Number(restauranteId),
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        precio: Number(precio),
        categoria: categoria.trim(),
        imagen_url: "",
        disponible: 1,
      });

      Alert.alert("Listo", "Plato creado ✅");
      router.back(); // vuelve a Home, que recarga por useFocusEffect
    } catch (e: any) {
      console.log("Error creando plato:", e);
      Alert.alert("Error", e?.message ?? "No se pudo crear el plato");
    } finally {
      setSaving(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <Text style={styles.title}>➕ Nuevo plato</Text>

        <Text style={styles.label}>Restaurante ID</Text>
        <TextInput
          value={restauranteId}
          onChangeText={setRestauranteId}
          keyboardType="number-pad"
          style={styles.input}
          placeholder="1"
        />

        <Text style={styles.label}>Nombre *</Text>
        <TextInput
          value={nombre}
          onChangeText={setNombre}
          style={styles.input}
          placeholder="Ej: Pizza margarita"
        />

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          value={descripcion}
          onChangeText={setDescripcion}
          style={[styles.input, styles.textarea]}
          placeholder="Opcional"
          multiline
        />

        <Text style={styles.label}>Precio *</Text>
        <TextInput
          value={precio}
          onChangeText={setPrecio}
          keyboardType="number-pad"
          style={styles.input}
          placeholder="Ej: 25000"
        />

        <Text style={styles.label}>Categoría</Text>
        <TextInput
          value={categoria}
          onChangeText={setCategoria}
          style={styles.input}
          placeholder="Ej: Pastas"
        />

        <Pressable
          onPress={onSave}
          disabled={!canSave}
          style={[styles.button, !canSave && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {saving ? "Guardando..." : "Guardar"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.link}>
          <Text style={styles.linkText}>Cancelar</Text>
        </Pressable>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 16 },

  label: { marginTop: 10, fontSize: 12, fontWeight: "700", color: "#333" },
  input: {
    marginTop: 6,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },

  button: {
    marginTop: 18,
    backgroundColor: "#000",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.35 },
  buttonText: { color: "#fff", fontWeight: "800" },

  link: { marginTop: 14, alignItems: "center" },
  linkText: { color: "#000", fontWeight: "700" },
});
