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
import { fetchFestivalById } from "../../services/festivalById";

type Detail = {
  id: number;
  municipio_id: number;
  id_municipio?: number; // Por si el backend usa este nombre
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  descripcion: string | null;
  municipio_nombre?: string;
  municipio?: string;
  departamento: string;
};

export default function FestivalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const BASE_URL = "https://festquest-backend.onrender.com";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Detail | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetchFestivalById(BASE_URL, id)
      .then((resp) => {
        if (!alive) return;
        // Cargamos la respuesta directa del servidor
        setData(resp as Detail);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message || "Error cargando detalle");
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
        <ActivityIndicator size="large" color="#FF6A00" />
        <Text style={styles.gray}>Cargando detalle…</Text>
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

      <View style={styles.card}>
        <Text style={styles.k}>Municipio</Text>
        {/* ✅ Busca el nombre en municipio_nombre o municipio */}
        <Text style={styles.v}>{data.municipio_nombre || data.municipio || "No disponible"}</Text>

        <Text style={styles.k}>Departamento</Text>
        <Text style={styles.v}>{data.departamento}</Text>

        <Text style={styles.k}>Fechas</Text>
        <Text style={styles.v}>
          {/* ✅ Formato de fecha corregido para evitar el 2026 estático */}
          {new Date(data.fecha_inicio).toLocaleDateString('es-CO', { timeZone: 'UTC' })} 
          {data.fecha_fin ? ` → ${new Date(data.fecha_fin).toLocaleDateString('es-CO', { timeZone: 'UTC' })}` : ""}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.k}>Descripción</Text>
        <Text style={styles.v}>
          {data.descripcion && String(data.descripcion).trim() !== ""
            ? data.descripcion
            : "Sin descripción disponible por ahora."}
        </Text>
      </View>

      <Pressable
        style={styles.btn}
        onPress={() =>
          router.push({
            pathname: "/municipality/[id]",
            params: { id: String(data.municipio_id || data.id_municipio || "0") },
          })
        }
      >
        <Text style={styles.btnText}>Ver municipio</Text>
      </Pressable>

      <View style={styles.small}>
        <Text style={styles.gray}>
          ID: {data.id} • municipio_id: {data.municipio_id || data.id_municipio}
        </Text>
      </View>
    </ScrollView>
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
  h1: { color: "white", fontSize: 22, fontWeight: "900", marginBottom: 12 },
  card: {
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#232323",
    marginBottom: 12,
  },
  k: { color: "#9a9a9a", fontWeight: "900", marginTop: 6 },
  v: { color: "#e6e6e6", marginTop: 4, fontWeight: "700" },
  gray: { color: "#9a9a9a", marginTop: 10 },
  err: { color: "#FF7777", fontWeight: "900" },
  small: { marginTop: 4 },
  btn: {
    marginTop: 8,
    backgroundColor: "#FF6A00",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "900" },
});