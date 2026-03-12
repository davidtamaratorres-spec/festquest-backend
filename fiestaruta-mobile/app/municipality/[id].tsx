import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { fetchMunicipalityById } from "../../services/municipalityById";

type Municipality = {
  id: number;
  nombre: string;
  departamento: string;
  descripcion: string | null;
  subregion: string | null;
  altitud_msnm: number | null;
  temperatura_prom: number | null;
  area_km2: number | null;
  habitantes: number | null;
  fundacion: number | null;
  bandera_url: string | null;
  festivalsCount?: number;
};

export default function MunicipalityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const BASE_URL = "http://192.168.1.6:3002";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Municipality | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetchMunicipalityById(BASE_URL, id)
      .then((resp: any) => {
        if (!alive) return;
        setData(resp.data as Municipality);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message || "Error cargando municipio");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.gray}>Cargando municipio…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>⚠️ {error}</Text>
        <Text style={styles.gray}>ID: {id}</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.gray}>Sin datos.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ padding: 14 }}>
      <Text style={styles.h1}>{data.nombre}</Text>
      <Text style={styles.h2}>{data.departamento}</Text>

      <View style={styles.card}>
        <Row label="Subregión" value={data.subregion ?? "—"} />
        <Row label="Altitud" value={data.altitud_msnm ?? "—"} suffix=" m" />
        <Row
          label="Temperatura"
          value={data.temperatura_prom ?? "—"}
          suffix=" °C"
        />
        <Row label="Área" value={data.area_km2 ?? "—"} suffix=" km²" />
        <Row label="Habitantes" value={data.habitantes ?? "—"} />
        <Row label="Fundación" value={data.fundacion ?? "—"} />
        <Row label="Festivales" value={data.festivalsCount ?? "—"} />
      </View>

      <View style={styles.card}>
        <Text style={styles.k}>Descripción</Text>
        <Text style={styles.v}>
          {data.descripcion && String(data.descripcion).trim() !== ""
            ? data.descripcion
            : "Sin descripción"}
        </Text>
      </View>

      {/* ✅ BOTÓN: Ver festivales del municipio (esta ruta la creamos abajo) */}
      <Pressable
        style={styles.btn}
        onPress={() =>
          router.push({
            pathname: "/municipality/[id]/festivals",
            params: { id: String(data.id) },
          })
        }
      >
        <Text style={styles.btnText}>Ver festivales de este municipio</Text>
      </Pressable>

      {/* Próximo: DishQuest / lugares */}
      <Pressable
        style={styles.btnSecondary}
        onPress={() => router.push("/coming-soon")}
      >
        <Text style={styles.btnSecondaryText}>
          Explorar comida y lugares (próximo)
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  suffix,
}: {
  label: string;
  value: any;
  suffix?: string;
}) {
  const v =
    value === null || value === undefined
      ? "—"
      : typeof value === "number"
      ? String(value)
      : String(value);

  return (
    <View style={styles.row}>
      <Text style={styles.rowK}>{label}</Text>
      <Text style={styles.rowV}>
        {v}
        {suffix ? suffix : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0b0b0b" },
  center: {
    flex: 1,
    backgroundColor: "#0b0b0b",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
  },
  h1: { color: "white", fontSize: 26, fontWeight: "900" },
  h2: { color: "#bdbdbd", marginTop: 4, marginBottom: 12, fontWeight: "700" },
  card: {
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#232323",
    marginBottom: 12,
  },
  k: { color: "#9a9a9a", fontWeight: "900" },
  v: { color: "#e6e6e6", marginTop: 6, fontWeight: "700" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f1f",
  },
  rowK: { color: "#9a9a9a", fontWeight: "900" },
  rowV: { color: "#e6e6e6", fontWeight: "800" },
  gray: { color: "#9a9a9a", marginTop: 10 },
  err: { color: "#FF7777", fontWeight: "900" },

  btn: {
    marginTop: 6,
    backgroundColor: "#FF6A00",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "900" },

  btnSecondary: {
    marginTop: 10,
    backgroundColor: "#101010",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  btnSecondaryText: { color: "#e6e6e6", fontWeight: "900" },
});
