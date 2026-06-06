import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { backendPost } from "../services/backendApi";
import { authService } from "./services/AuthService";

type ExtractedDish = {
  nombre: string;
  precio: number;
  ingredientes: string[];
  descripcion: string;
  categoria: string;
  selected: boolean;
};

type MenuIaResponse = {
  platos: Omit<ExtractedDish, "selected">[];
};

type SelectedImage = {
  uri: string;
  width: number;
  height: number;
  mediaType: string;
};

type SourceMode = "image" | "text" | "url";
type ImageSource = "camera" | "gallery";

const SAVE_OPTIONS = {
  compress: 0.82,
  format: ImageManipulator.SaveFormat.JPEG,
  base64: true,
};

export default function MenuIaScreen() {
  const router = useRouter();
  const [sourceMode, setSourceMode] = useState<SourceMode>("image");
  const [lastImageSource, setLastImageSource] = useState<ImageSource>("camera");
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [menuText, setMenuText] = useState("");
  const [menuUrl, setMenuUrl] = useState("");
  const [platos, setPlatos] = useState<ExtractedDish[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);

  function resetResult() {
    setPlatos([]);
  }

  function normalizeDishes(data: MenuIaResponse) {
    setPlatos(
      (data.platos || []).map((plato) => ({
        nombre: plato.nombre || "",
        precio: Number(plato.precio) || 0,
        ingredientes: plato.ingredientes || [],
        descripcion: plato.descripcion || "",
        categoria: plato.categoria || "Menu",
        selected: true,
      }))
    );
  }

  function setPickedImage(asset: ImagePicker.ImagePickerAsset, source: ImageSource) {
    setSourceMode("image");
    setLastImageSource(source);
    setImage({
      uri: asset.uri,
      width: asset.width || 1200,
      height: asset.height || 1600,
      mediaType: asset.mimeType || "image/jpeg",
    });
    resetResult();
  }

  async function pickFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Se necesita acceso a la camara.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setPickedImage(result.assets[0], "camera");
  }

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Se necesita acceso a la galeria.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled) setPickedImage(result.assets[0], "gallery");
  }

  async function rotateImage() {
    if (!image) return;
    try {
      const result = await ImageManipulator.manipulateAsync(image.uri, [{ rotate: 90 }], SAVE_OPTIONS);
      setImage({ uri: result.uri, width: result.width, height: result.height, mediaType: "image/jpeg" });
      resetResult();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo rotar la imagen.");
    }
  }

  async function analyzeImage() {
    if (!image || extracting) return;
    setExtracting(true);
    resetResult();
    try {
      const prepared = await ImageManipulator.manipulateAsync(image.uri, [], SAVE_OPTIONS);
      if (!prepared.base64) throw new Error("No se pudo preparar la imagen.");
      const data = await backendPost<MenuIaResponse>("/partner/menu-ia", {
        image_base64: prepared.base64,
        media_type: "image/jpeg",
      });
      normalizeDishes(data);
    } catch (e: any) {
      Alert.alert("Error IA", e?.message ?? "No se pudo extraer el menu.");
    } finally {
      setExtracting(false);
    }
  }

  async function retakeImage() {
    setImage(null);
    resetResult();
    if (lastImageSource === "gallery") {
      await pickFromGallery();
      return;
    }
    await pickFromCamera();
  }

  async function analyzeText() {
    const text = menuText.trim();
    if (!text) {
      Alert.alert("Menu vacio", "Escribe el menu antes de enviarlo a la IA.");
      return;
    }
    setExtracting(true);
    resetResult();
    try {
      const data = await backendPost<MenuIaResponse>("/partner/menu-ia", { menu_text: text });
      normalizeDishes(data);
    } catch (e: any) {
      Alert.alert("Error IA", e?.message ?? "No se pudo extraer el menu.");
    } finally {
      setExtracting(false);
    }
  }

  async function analyzeUrl() {
    const url = menuUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      Alert.alert("URL invalida", "Pega una URL que empiece por http:// o https://.");
      return;
    }
    setExtracting(true);
    resetResult();
    try {
      const data = await backendPost<MenuIaResponse>("/partner/menu-ia", { menu_url: url });
      normalizeDishes(data);
    } catch (e: any) {
      Alert.alert("Error IA", e?.message ?? "No se pudo leer la URL del menu.");
    } finally {
      setExtracting(false);
    }
  }

  function updateDish(index: number, patch: Partial<ExtractedDish>) {
    setPlatos((prev) => prev.map((plato, i) => (i === index ? { ...plato, ...patch } : plato)));
  }

  async function saveSelected() {
    if (saving) return;
    const selected = platos.filter((plato) => plato.selected);
    if (selected.length === 0) {
      Alert.alert("Sin seleccion", "Selecciona al menos un plato para guardar.");
      return;
    }

    const isLogged = await authService.isLoggedIn();
    if (!isLogged) {
      router.replace("/partner/auth");
      return;
    }

    setSaving(true);
    try {
      for (const plato of selected) {
        if (!plato.nombre.trim()) continue;
        const ingredientsText = plato.ingredientes.length ? `Ingredientes: ${plato.ingredientes.join(", ")}` : "";
        const descripcion = [plato.descripcion.trim(), ingredientsText].filter(Boolean).join("\n");
        await backendPost("/partner/platos", {
          nombre: plato.nombre.trim(),
          descripcion,
          precio: Number(plato.precio) || 0,
          categoria: plato.categoria.trim() || "Menu",
          imagen_url: "",
          disponible: 1,
          tiene_descuento: 0,
          porcentaje_descuento: 0,
          acepta_domicilio: 0,
          acepta_reserva: 0,
        });
      }
      Alert.alert("Platos guardados", "Los platos seleccionados fueron creados.", [
        { text: "OK", onPress: () => router.replace("/partner/home") },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudieron guardar los platos.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Subir menu con IA</Text>

      {!image ? (
        <View style={styles.sourceGrid}>
          <Pressable style={styles.sourceButton} onPress={pickFromCamera} disabled={extracting || saving}>
            <Text style={styles.sourceText}>📷 Tomar foto con cámara</Text>
          </Pressable>
          <Pressable style={styles.sourceButton} onPress={pickFromGallery} disabled={extracting || saving}>
            <Text style={styles.sourceText}>🖼️ Seleccionar de galería</Text>
          </Pressable>
          <Pressable
            style={[styles.sourceButton, sourceMode === "text" && styles.sourceButtonActive]}
            onPress={() => setSourceMode("text")}
            disabled={extracting || saving}
          >
            <Text style={styles.sourceText}>📝 Escribir menú en texto libre</Text>
          </Pressable>
          <Pressable
            style={[styles.sourceButton, sourceMode === "url" && styles.sourceButtonActive]}
            onPress={() => setSourceMode("url")}
            disabled={extracting || saving}
          >
            <Text style={styles.sourceText}>🔗 Pegar URL de menú online</Text>
          </Pressable>
        </View>
      ) : null}

      {sourceMode === "image" && image ? (
        <View style={styles.imageEditor}>
          <Text style={styles.editorTitle}>Revisa la imagen antes de enviarla</Text>
          <Image source={{ uri: image.uri }} style={styles.largePreview} resizeMode="contain" />
          <Pressable style={styles.toolButton} onPress={rotateImage} disabled={extracting}>
            <Text style={styles.toolText}>🔄 Rotar</Text>
          </Pressable>
          <Pressable style={styles.confirmButton} onPress={analyzeImage} disabled={extracting || saving}>
            <Text style={styles.buttonText}>{extracting ? "Analizando..." : "✅ Usar esta imagen"}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={retakeImage} disabled={extracting || saving}>
            <Text style={styles.secondaryText}>📷 Volver a tomar</Text>
          </Pressable>
        </View>
      ) : null}

      {sourceMode === "text" && !image ? (
        <View style={styles.editor}>
          <TextInput
            style={[styles.input, styles.freeText]}
            placeholder="Pega o escribe aqui el menu completo..."
            value={menuText}
            onChangeText={setMenuText}
            multiline
          />
          <Pressable style={styles.button} onPress={analyzeText} disabled={extracting || saving}>
            <Text style={styles.buttonText}>{extracting ? "Analizando..." : "Extraer platos del texto"}</Text>
          </Pressable>
        </View>
      ) : null}

      {sourceMode === "url" && !image ? (
        <View style={styles.editor}>
          <TextInput
            style={styles.input}
            placeholder="https://restaurante.com/menu"
            value={menuUrl}
            onChangeText={setMenuUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
          <Pressable style={styles.button} onPress={analyzeUrl} disabled={extracting || saving}>
            <Text style={styles.buttonText}>{extracting ? "Analizando..." : "Extraer platos de la URL"}</Text>
          </Pressable>
        </View>
      ) : null}

      {extracting ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6A00" />
          <Text style={styles.muted}>Extrayendo platos, precios e ingredientes...</Text>
        </View>
      ) : null}

      {platos.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Preview IA antes de guardar</Text>
          {platos.map((plato, index) => (
            <View key={`${plato.nombre}-${index}`} style={styles.card}>
              <View style={styles.switchRow}>
                <Text style={styles.cardTitle}>Guardar plato</Text>
                <Switch
                  value={plato.selected}
                  onValueChange={(selected) => updateDish(index, { selected })}
                  trackColor={{ true: "#FF6A00" }}
                />
              </View>
              <Text style={styles.label}>Nombre</Text>
              <TextInput style={styles.input} value={plato.nombre} onChangeText={(nombre) => updateDish(index, { nombre })} />
              <Text style={styles.label}>Precio</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(plato.precio || "")}
                onChangeText={(precio) => updateDish(index, { precio: Number(precio) || 0 })}
              />
              <Text style={styles.label}>Descripcion</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                multiline
                value={plato.descripcion}
                onChangeText={(descripcion) => updateDish(index, { descripcion })}
              />
              <Text style={styles.label}>Categoria</Text>
              <TextInput style={styles.input} value={plato.categoria} onChangeText={(categoria) => updateDish(index, { categoria })} />
              {plato.ingredientes.length ? (
                <Text style={styles.ingredients}>Ingredientes: {plato.ingredientes.join(", ")}</Text>
              ) : null}
            </View>
          ))}

          <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={saveSelected} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? "Guardando..." : "Guardar seleccionados"}</Text>
          </Pressable>
        </>
      ) : null}

      <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryText}>Volver</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 16 },
  sourceGrid: { gap: 10, marginBottom: 16 },
  sourceButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    padding: 14,
    justifyContent: "center",
  },
  sourceButtonActive: { borderColor: "#FF6A00", backgroundColor: "#FFF3EA" },
  sourceText: { color: "#111", fontWeight: "800" },
  editor: { gap: 12, marginBottom: 18 },
  imageEditor: { gap: 12, marginBottom: 18 },
  editorTitle: { fontSize: 16, fontWeight: "800", color: "#111" },
  largePreview: { width: "100%", height: 420, borderRadius: 10, backgroundColor: "#111" },
  toolButton: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  toolText: { color: "#333", fontWeight: "800" },
  button: { backgroundColor: "#FF6A00", borderRadius: 10, padding: 15, alignItems: "center" },
  confirmButton: { backgroundColor: "#159447", borderRadius: 10, padding: 15, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "800" },
  center: { alignItems: "center", gap: 10, marginVertical: 24 },
  muted: { color: "#666", textAlign: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#111", marginTop: 22, marginBottom: 12 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 14, marginBottom: 12, backgroundColor: "#fafafa" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: "800", color: "#111" },
  label: { fontSize: 12, fontWeight: "800", color: "#777", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 11, marginBottom: 10, backgroundColor: "#fff" },
  freeText: { minHeight: 170, textAlignVertical: "top" },
  textarea: { height: 78, textAlignVertical: "top" },
  ingredients: { fontSize: 12, color: "#555", lineHeight: 18 },
  saveButton: { backgroundColor: "#111", borderRadius: 10, padding: 15, alignItems: "center", marginTop: 8 },
  saveButtonText: { color: "#fff", fontWeight: "800" },
  disabled: { opacity: 0.55 },
  secondaryButton: { backgroundColor: "#eee", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 10 },
  secondaryText: { color: "#333", fontWeight: "800" },
});
