import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { fetchFestivalsByMunicipalityId } from "../../../services/festivalsByMunicipalityId";

type Festival = {
  id: number;
  municipio_id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  descripcion: string | null;
  municipio_nombre: string;
  departamento: string;
};

export default function MunicipalityFestivals() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const BASE_URL = "http://192.168.1.6:3002";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Festival[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetchFestivalsByMunicipalityId(BASE_URL, id)
      .then((resp: any) => {
        if (!alive) return;
        setRows((resp?.data || []) as Festival[]);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message || "Error cargando festivales");
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
        <Text style={styles.gray}>Cargando festivales…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>⚠️ {error}</Text>
        <Text style={styles.gray}>municipio_id: {id}</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Festivales del municipio</Text>
        <Text style={styles.subtitle}>municipio_id: {id}</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 14, gap: 12 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/festival/${item.id}`)}
          >
            <Text style={styles.name}>{item.nombre}</Text>
            <Text style={styles.meta}>
              {item.municipio_nombre} · {item.departamento}
            </Text>
            <Text style={styles.dates}>
              {item.fecha_inicio} → {item.fecha_fin || item.fecha_inicio}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ padding: 14 }}>
            <Text style={styles.gray}>No hay festivales para este municipio.</Text>
          </View>
        }
      />
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
  header: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6 },
  title: { color: "white", fontSize: 20, fontWeight: "900" },
  subtitle: { color: "#9a9a9a", marginTop: 4, fontWeight: "700" },

  card: {
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#232323",
  },
  name: { color: "white", fontWeight: "900", fontSize: 16 },
  meta: { color: "#bdbdbd", marginTop: 4, fontWeight: "700" },
  dates: { color: "#9a9a9a", marginTop: 6, fontWeight: "700" },

  gray: { color: "#9a9a9a", marginTop: 10 },
  err: { color: "#FF7777", fontWeight: "900" },
});
