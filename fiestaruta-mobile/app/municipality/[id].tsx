import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

type MunicipalityFestival = {
  id: number;
  nombre: string;
  fecha: string | null;
  municipio_id: number;
  municipio: string;
  departamento: string;
  subregion?: string | null;
  habitantes?: string | null;
  temperatura_promedio?: string | null;
  altura?: string | null;
};

export default function MunicipalityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [festivals, setFestivals] = useState<MunicipalityFestival[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const municipioInfo = festivals.length > 0 ? festivals[0] : null;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          "https://festquest-backend.onrender.com/api/festivals"
        );

        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("La respuesta no es una lista válida");
        }

        const filtrados = data.filter(
          (item: any) => String(item.municipio_id) === String(id)
        );

        setFestivals(filtrados);
      } catch (err: any) {
        console.log("Error municipio:", err);
        setError("Error al conectar con el servidor");
        setFestivals([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6A00" />
        <Text style={styles.loadingText}>Buscando municipio...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backTxt}>← Volver</Text>
      </Pressable>

      {municipioInfo ? (
        <>
          <Text style={styles.title}>{municipioInfo.municipio}</Text>
          <Text style={styles.subtitle}>
            {municipioInfo.departamento}
            {municipioInfo.subregion ? ` · ${municipioInfo.subregion}` : ""}
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoLine}>
              👥 Habitantes: {municipioInfo.habitantes || "No disponible"}
            </Text>
            <Text style={styles.infoLine}>
              🌡 Temperatura promedio:{" "}
              {municipioInfo.temperatura_promedio
                ? `${municipioInfo.temperatura_promedio}°C`
                : "No disponible"}
            </Text>
            <Text style={styles.infoLine}>
              ⛰ Altura:{" "}
              {municipioInfo.altura
                ? `${municipioInfo.altura} m`
                : "No disponible"}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Festivales del municipio</Text>
        </>
      ) : (
        <Text style={styles.title}>Municipio</Text>
      )}

      {error ? (
        <Text style={styles.err}>{error}</Text>
      ) : (
        <FlatList
          data={festivals}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/festival/${item.id}`)}
            >
              <Text style={styles.fest}>{item.nombre}</Text>
              <Text style={styles.info}>
                📅 {item.fecha || "Sin fecha"}
              </Text>
              <Text style={styles.detailLink}>Ver festival →</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No se encontraron festivales para este municipio.
            </Text>
          }
          contentContainerStyle={
            festivals.length === 0 ? { flexGrow: 1 } : { paddingBottom: 30 }
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#0b0b0b",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b0b0b",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
  },
  back: {
    marginBottom: 20,
  },
  backTxt: {
    color: "#FF6A00",
    fontWeight: "bold",
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 4,
    color: "#fff",
  },
  subtitle: {
    color: "#aaa",
    fontSize: 15,
    marginBottom: 18,
  },
  infoBox: {
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  infoLine: {
    color: "#e6e6e6",
    marginBottom: 8,
    fontSize: 14,
  },
  sectionTitle: {
    color: "#FF6A00",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
  },
  card: {
    padding: 15,
    backgroundColor: "#141414",
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: "#FF6A00",
  },
  fest: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 6,
    fontSize: 17,
  },
  info: {
    color: "#bbb",
    fontSize: 13,
    marginBottom: 8,
  },
  detailLink: {
    color: "#FF6A00",
    fontWeight: "bold",
    fontSize: 13,
    textAlign: "right",
  },
  err: {
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
  empty: {
    textAlign: "center",
    marginTop: 50,
    color: "#999",
  },
});