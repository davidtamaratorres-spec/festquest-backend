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
import { BASE_URL } from "../../services/backendApi";

type FestivalDetail = {
  id: number;
  nombre: string | null;
  municipio: string | null;
  departamento: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  descripcion: string | null;
  lugar_encuentro: string | null;
  maps_link: string | null;
  whatsapp_link: string | null;
  municipio_id: number | null;
  subregion: string | null;
  habitantes: number | null;
  temperatura_promedio: number | null;
  altura: number | null;
  sitios_turisticos: string | null;
  hoteles: string | null;
};

const MESES = [
  "ene","feb","mar","abr","may","jun",
  "jul","ago","sep","oct","nov","dic",
];

function formatFecha(fecha: string | null): string | null {
  if (!fecha) return null;
  const parts = fecha.split("-");
  if (parts.length !== 3) return fecha;
  const [year, month, day] = parts;
  return `${Number(day)} ${MESES[Number(month) - 1]} ${year}`;
}

function isCleanValue(value: string | null | undefined): boolean {
  if (!value || !value.trim()) return false;
  if (value.includes("google.com/search")) return false;
  return true;
}

function parsePipeList(value: string | null | undefined): string[] {
  if (!isCleanValue(value)) return [];
  return value!
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.includes("google.com/search"));
}

async function abrirURL(url: string | null) {
  if (!url) return;
  let finalUrl = url.trim();
  if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`;
  try {
    await Linking.openURL(finalUrl);
  } catch {}
}

export default function FestivalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<FestivalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("ID inválido");
      setLoading(false);
      return;
    }

    fetch(`${BASE_URL}/festivals/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((json) => setData(json))
      .catch(() => setError("No se pudo cargar el festival"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6A00" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Festival no encontrado"}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Volver</Text>
        </Pressable>
      </View>
    );
  }

  const fechaInicio = formatFecha(data.fecha_inicio);
  const fechaFin = formatFecha(data.fecha_fin);
  const fechaTexto =
    fechaInicio && fechaFin
      ? `${fechaInicio} – ${fechaFin}`
      : fechaInicio || fechaFin || "Sin fecha";

  const ubicacion = [data.municipio, data.departamento].filter(Boolean).join(", ");
  const sitios = parsePipeList(data.sitios_turisticos);
  const hoteles = parsePipeList(data.hoteles);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Volver</Text>
      </Pressable>

      {/* Nombre */}
      <Text style={styles.title}>{data.nombre}</Text>

      {/* Municipio y departamento */}
      {ubicacion ? (
        <View style={styles.pill}>
          <Text style={styles.pillText}>📍 {ubicacion}</Text>
        </View>
      ) : null}

      {/* Fechas */}
      <View style={styles.pill}>
        <Text style={styles.pillText}>📅 {fechaTexto}</Text>
      </View>

      {/* Datos del municipio */}
      {(data.subregion || data.habitantes || data.temperatura_promedio || data.altura) ? (
        <View style={styles.statsRow}>
          {data.subregion ? (
            <View style={styles.statChip}>
              <Text style={styles.statLabel}>Subregión</Text>
              <Text style={styles.statValue}>{data.subregion}</Text>
            </View>
          ) : null}
          {data.habitantes ? (
            <View style={styles.statChip}>
              <Text style={styles.statLabel}>Habitantes</Text>
              <Text style={styles.statValue}>{Number(data.habitantes).toLocaleString("es-CO")}</Text>
            </View>
          ) : null}
          {data.temperatura_promedio ? (
            <View style={styles.statChip}>
              <Text style={styles.statLabel}>Temperatura</Text>
              <Text style={styles.statValue}>{data.temperatura_promedio}°C</Text>
            </View>
          ) : null}
          {data.altura ? (
            <View style={styles.statChip}>
              <Text style={styles.statLabel}>Altura</Text>
              <Text style={styles.statValue}>{Number(data.altura).toLocaleString("es-CO")} msnm</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Descripción */}
      {data.descripcion ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DESCRIPCIÓN</Text>
          <Text style={styles.body}>{data.descripcion}</Text>
        </View>
      ) : null}

      {/* Lugar de encuentro */}
      {data.lugar_encuentro ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LUGAR</Text>
          <Text style={styles.body}>{data.lugar_encuentro}</Text>
        </View>
      ) : null}

      {/* Sitios recomendados — solo si hay datos limpios */}
      {sitios.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SITIOS RECOMENDADOS</Text>
          {sitios.map((s, i) => (
            <Text key={i} style={styles.listItem}>📍 {s}</Text>
          ))}
        </View>
      ) : null}

      {/* Hoteles — solo si hay datos limpios */}
      {hoteles.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOTELES</Text>
          {hoteles.map((h, i) => (
            <Text key={i} style={styles.listItem}>🏨 {h}</Text>
          ))}
        </View>
      ) : null}

      {/* Botones de acción */}
      <View style={styles.actions}>
        {data.maps_link ? (
          <Pressable style={styles.btnPrimary} onPress={() => abrirURL(data.maps_link)}>
            <Text style={styles.btnPrimaryText}>Ver en mapa</Text>
          </Pressable>
        ) : null}

        {data.whatsapp_link ? (
          <Pressable style={styles.btnWhatsapp} onPress={() => abrirURL(data.whatsapp_link)}>
            <Text style={styles.btnWhatsappText}>WhatsApp</Text>
          </Pressable>
        ) : null}

        {data.municipio_id ? (
          <Pressable
            style={styles.btnSecondary}
            onPress={() => router.push(`/municipality/${data.municipio_id}`)}
          >
            <Text style={styles.btnSecondaryText}>Ver municipio</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#000" },
  content: { padding: 20, paddingBottom: 48 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    gap: 16,
    padding: 24,
  },
  loadingText: { color: "#888", marginTop: 10 },
  errorText: { color: "#ff6b6b", fontSize: 15, textAlign: "center" },
  backBtn: { marginTop: 4 },
  backBtnText: { color: "#FF6A00", fontSize: 15 },
  back: { color: "#FF6A00", marginBottom: 20, fontSize: 15 },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 14,
    lineHeight: 30,
  },
  pill: {
    backgroundColor: "#161616",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  pillText: { color: "#ccc", fontSize: 13 },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  statChip: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#222",
    minWidth: "45%",
    flex: 1,
  },
  statLabel: { color: "#FF6A00", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  statValue: { color: "#fff", fontSize: 13, fontWeight: "600", marginTop: 2 },
  section: { marginTop: 22 },
  sectionLabel: {
    color: "#FF6A00",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  body: { color: "#ccc", fontSize: 14, lineHeight: 22 },
  listItem: { color: "#ccc", fontSize: 14, marginBottom: 6 },
  actions: { marginTop: 28, gap: 12 },
  btnPrimary: {
    backgroundColor: "#FF6A00",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  btnWhatsapp: {
    backgroundColor: "#161616",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#25D366",
  },
  btnWhatsappText: { color: "#25D366", fontWeight: "700", fontSize: 15 },
  btnSecondary: {
    backgroundColor: "#161616",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  btnSecondaryText: { color: "#888", fontWeight: "700", fontSize: 15 },
});
