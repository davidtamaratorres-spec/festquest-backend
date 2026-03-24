import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { fetchFestivalById } from "../../services/festivals";

type FestivalDetailData = {
  id: number;
  nombre?: string | null;
  municipio?: string | null;
  departamento?: string | null;
  fecha?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  subregion?: string | null;
  habitantes?: string | number | null;
  temperatura_promedio?: string | number | null;
  altura?: string | number | null;
  sitios_turisticos?: string | null;
  hoteles?: string | null;
  contacto_hoteles?: string | null;
  municipio_id?: number | null;
};

function valorTexto(value: any, fallback = "Sin dato") {
  if (value === null || value === undefined) return fallback;
  const txt = String(value).trim();
  return txt ? txt : fallback;
}

function fechaTexto(data: FestivalDetailData | null) {
  if (!data) return "Sin fecha";
  return data.fecha_inicio || data.fecha || "Sin fecha";
}

function splitPipe(value: any) {
  if (!value) return [];
  return String(value)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function FestivalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<FestivalDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!id) {
      setErrorText("ID inválido");
      setLoading(false);
      return;
    }

    async function loadFestival() {
      try {
        const json = await fetchFestivalById(id);
        const detalle = json?.data ? json.data : json;
        setData(detalle);
      } catch (error) {
        setErrorText("Error cargando festival");
      } finally {
        setLoading(false);
      }
    }

    loadFestival();
  }, [id]);

  const abrirLink = async (url?: string | null) => {
    if (!url) return;
    let finalUrl = String(url).trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }
    try {
      await Linking.openURL(finalUrl);
    } catch {}
  };

  const lugares = splitPipe(data?.sitios_turisticos);
  const hoteles = splitPipe(data?.hoteles);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6A00" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{errorText}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Volver</Text>
      </Pressable>

      <Text style={styles.title}>{data.nombre}</Text>

      <Text style={styles.section}>Sitios recomendados</Text>
      {lugares.map((item, i) => (
        <Text key={i} style={styles.link}>📍 {item}</Text>
      ))}

      <Text style={styles.section}>Hoteles</Text>
      {hoteles.map((item, i) => (
        <Text key={i} style={styles.link}>🏨 {item}</Text>
      ))}

      <Text style={styles.section}>Contacto hoteles</Text>
      <Text style={styles.blockText}>
        {data?.contacto_hoteles || "No hay contacto"}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#000" },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#fff", marginTop: 10 },
  errorText: { color: "#fff" },
  back: { color: "#FF6A00", marginBottom: 10 },
  title: { color: "#fff", fontSize: 22, marginBottom: 10 },
  section: { color: "#FF6A00", marginTop: 15 },
  link: { color: "#4da3ff", marginTop: 5 },
  blockText: { color: "#ccc", marginTop: 5 },
});