import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

type Municipio = {
  id: number;
  nombre: string;
  departamento: string;
  descripcion?: string | null;
  subregion?: string | null;
  altitud_msnm?: number | null;
  temperatura_prom?: number | null;
  area_km2?: number | null;
  habitantes?: number | null;
  fundacion?: number | null;
  bandera_url?: string | null;
  festivalsCount?: number | null;
};

function fmtNum(n: any) {
  if (n === null || n === undefined) return "—";
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("es-CO").format(num);
}

function fmtText(s: any) {
  const v = String(s ?? "").trim();
  return v ? v : "—";
}

export default function MunicipioDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // ✅ IMPORTANTE: en celular NO uses localhost
  // Tu PC (según tu ipconfig) es:
  // 192.168.1.6
  const BASE_URL = "http://192.168.1.6:3002";

  const url = useMemo(() => `${BASE_URL}/api/v1/municipalities/${id}`, [id]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Municipio | null>(null);

  const load = () => {
    setLoading(true);
    setErr(null);

    fetch(url)
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        return j;
      })
      .then((j) => {
        setData(j?.data ?? null);
      })
      .catch((e: any) => {
        setErr(e?.message || "Error cargando municipio");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [url]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Cargando municipio...</Text>
      </View>
    );
  }

  if (err) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Error</Text>
        <Text style={[styles.muted, { marginTop: 10 }]}>{err}</Text>

        <Pressable style={styles.btn} onPress={load}>
          <Text style={styles.btnText}>Reintentar</Text>
        </Pressable>

        <Text style={styles.hint}>
          Nota: si estás en Expo Go, el backend debe estar corriendo en tu PC y ambos en la misma WiFi.
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No encontrado</Text>
        <Text style={[styles.muted, { marginTop: 10 }]}>No hay datos para este municipio.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.h1}>{data.nombre}</Text>
        <Text style={styles.sub}>{data.departamento} · {fmtText(data.subregion)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ficha rápida</Text>

        <Row label="Subregión" value={fmtText(data.subregion)} />
        <Row label="Altitud (msnm)" value={data.altitud_msnm ?? "—"} />
        <Row label="Temp. promedio (°C)" value={data.temperatura_prom ?? "—"} />
        <Row label="Área (km²)" value={fmtNum(data.area_km2)} />
        <Row label="Habitantes" value={fmtNum(data.habitantes)} />
        <Row label="Fundación" value={data.fundacion ?? "—"} />
        <Row label="Festivales registrados" value={data.festivalsCount ?? "—"} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Descripción</Text>
        <Text style={styles.p}>
          {data.descripcion ? data.descripcion : "Sin descripción"}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.btnOutline} onPress={() => router.back()}>
          <Text style={styles.btnOutlineText}>Volver</Text>
        </Pressable>

        <Pressable
          style={styles.btn}
          onPress={() => router.push(`/festivals?municipioId=${data.id}`)}
        >
          <Text style={styles.btnText}>Ver festivales</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>ID: {data.id}</Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.row}>
      <Text style={styles.k}>{label}</Text>
      <Text style={styles.v}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b0b0b" },
  container: { padding: 14, paddingBottom: 24 },

  center: { flex: 1, backgroundColor: "#0b0b0b", justifyContent: "center", alignItems: "center", padding: 14 },

  header: { marginTop: 6, marginBottom: 12 },
  h1: { color: "white", fontSize: 26, fontWeight: "900" },
  sub: { marginTop: 6, color: "#9a9a9a", fontWeight: "700" },

  card: {
    marginTop: 12,
    width: "100%",
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#232323",
  },
  cardTitle: { color: "white", fontWeight: "900", marginBottom: 10, fontSize: 14 },

  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1f1f1f" },
  k: { color: "#9a9a9a", fontWeight: "900", width: "55%" },
  v: { color: "#e6e6e6", fontWeight: "700", width: "45%", textAlign: "right" },

  p: { color: "#cfcfcf", lineHeight: 20 },

  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: { flex: 1, backgroundColor: "#ff6a00", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnText: { color: "white", fontWeight: "900" },
  btnOutline: { flex: 1, borderWidth: 1, borderColor: "#333", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnOutlineText: { color: "#e6e6e6", fontWeight: "900" },

  muted: { color: "#9a9a9a", fontWeight: "700" },
  title: { color: "white", fontSize: 20, fontWeight: "900" },
  hint: { color: "#777", marginTop: 14, fontSize: 12, textAlign: "center" },
  footer: { color: "#666", marginTop: 12, textAlign: "center", fontSize: 12 },
});
