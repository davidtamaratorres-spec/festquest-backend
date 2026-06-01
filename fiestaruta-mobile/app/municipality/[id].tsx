import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function MunicipalityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(
          `https://festquest-backend.onrender.com/api/municipalities/${id}`
        );
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setData(json);
      } catch {
        setError("No se pudo cargar el municipio");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const municipio = useMemo(() => {
    if (!data) return null;
    return data.municipio || data;
  }, [data]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6A00" />
        <Text style={styles.loadingText}>Cargando municipio...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>{error}</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: "#FF6A00" }}>← Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (!municipio) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>No se encontró información</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Volver</Text>
      </Pressable>

      <Text style={styles.title}>{municipio.nombre}</Text>
      <Text style={styles.subtitle}>{municipio.departamento}</Text>

      <View style={styles.box}>
        {municipio.subregion ? (
          <Text style={styles.text}>🌎 {municipio.subregion}</Text>
        ) : null}
        {municipio.habitantes ? (
          <Text style={styles.text}>👥 {municipio.habitantes} habitantes</Text>
        ) : null}
        {municipio.temperatura_promedio ? (
          <Text style={styles.text}>🌡 {municipio.temperatura_promedio}°C promedio</Text>
        ) : null}
        {municipio.altura ? (
          <Text style={styles.text}>⛰ {municipio.altura} msnm</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0b" },
  content: { padding: 20, paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b0b0b",
    padding: 20,
  },
  loadingText: { color: "#fff", marginTop: 10 },
  back: { color: "#FF6A00", marginBottom: 16, fontSize: 15 },
  title: { color: "#fff", fontSize: 26, fontWeight: "bold", marginBottom: 4 },
  subtitle: { color: "#aaa", marginBottom: 16, fontSize: 14 },
  box: {
    backgroundColor: "#141414",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  text: { color: "#ddd", fontSize: 14 },
});
