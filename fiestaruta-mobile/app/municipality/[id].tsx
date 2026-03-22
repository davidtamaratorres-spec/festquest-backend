import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Linking,
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

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt);
        }

        const json = await res.json();
        setData(json);
      } catch (e: any) {
        console.log("ERROR MUNICIPIO:", e);
        setError("No se pudo cargar el municipio");
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
        <Text style={{ color: "#fff" }}>Cargando municipio...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff" }}>{error}</Text>
      </View>
    );
  }

  const m = data?.municipio;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Volver</Text>
      </Pressable>

      <Text style={styles.title}>{m?.nombre}</Text>
      <Text style={styles.subtitle}>{m?.departamento}</Text>

      <View style={styles.box}>
        <Text style={styles.text}>🌎 {m?.subregion || "Sin dato"}</Text>
        <Text style={styles.text}>👥 {m?.habitantes || "Sin dato"}</Text>
        <Text style={styles.text}>
          🌡 {m?.temperatura_promedio || "Sin dato"}
        </Text>
        <Text style={styles.text}>⛰ {m?.altura || "Sin dato"}</Text>
      </View>

      <Text style={styles.section}>Lugares</Text>
      {data?.places?.length ? (
        data.places.map((p: any, i: number) => (
          <Pressable key={i} onPress={() => Linking.openURL(p.maps_link)}>
            <Text style={styles.link}>📍 {p.nombre}</Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.empty}>No hay lugares</Text>
      )}

      <Text style={styles.section}>Hoteles</Text>
      {data?.hotels?.length ? (
        data.hotels.map((h: any, i: number) => (
          <Pressable key={i} onPress={() => Linking.openURL(h.whatsapp_link)}>
            <Text style={styles.link}>🏨 {h.nombre}</Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.empty}>No hay hoteles</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0b" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b0b0b",
  },
  back: { color: "#FF6A00", marginBottom: 10 },
  title: { color: "#fff", fontSize: 26, fontWeight: "bold" },
  subtitle: { color: "#aaa", marginBottom: 15 },
  box: {
    backgroundColor: "#141414",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  text: { color: "#ddd", marginBottom: 5 },
  section: {
    color: "#FF6A00",
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 10,
  },
  link: { color: "#4da3ff", marginBottom: 6 },
  empty: { color: "#777", marginBottom: 10 },
});