import React, { useEffect, useMemo, useState } from "react";
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

function splitPipe(value: any) {
  if (!value) return [];
  return String(value)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

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

  const municipio = useMemo(() => {
    if (!data) return null;
    return data.municipio || data;
  }, [data]);

  const places = useMemo(() => {
    if (!data || !municipio) return [];

    if (Array.isArray(data.places) && data.places.length > 0) {
      return data.places;
    }

    const names = splitPipe(municipio.sitios_turisticos);

    return names.map((nombre: string) => ({
      nombre,
      maps_link: `https://www.google.com/maps/search/${encodeURIComponent(
        `${nombre}, ${municipio.nombre}, ${municipio.departamento}, Colombia`
      )}`,
    }));
  }, [data, municipio]);

  const hotels = useMemo(() => {
    if (!data || !municipio) return [];

    if (Array.isArray(data.hotels) && data.hotels.length > 0) {
      return data.hotels;
    }

    const names = splitPipe(municipio.hoteles);
    const contacts = splitPipe(municipio.contacto_hoteles);

    return names.map((nombre: string, i: number) => ({
      nombre,
      whatsapp_link:
        contacts[i] ||
        `https://www.google.com/search?q=${encodeURIComponent(
          `${nombre} ${municipio.nombre} ${municipio.departamento} whatsapp`
        )}`,
    }));
  }, [data, municipio]);

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
        <Text style={styles.text}>🌎 {municipio.subregion || "Sin dato"}</Text>
        <Text style={styles.text}>👥 {municipio.habitantes || "Sin dato"}</Text>
        <Text style={styles.text}>
          🌡 {municipio.temperatura_promedio || "Sin dato"}
        </Text>
        <Text style={styles.text}>⛰ {municipio.altura || "Sin dato"}</Text>
      </View>

      <Text style={styles.section}>Lugares</Text>
      {places.length ? (
        places.map((p: any, i: number) => (
          <Pressable
            key={`place-${i}`}
            onPress={() => p.maps_link && Linking.openURL(p.maps_link)}
            style={styles.item}
          >
            <Text style={styles.link}>📍 {p.nombre}</Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.empty}>No hay lugares</Text>
      )}

      <Text style={styles.section}>Hoteles</Text>
      {hotels.length ? (
        hotels.map((h: any, i: number) => (
          <Pressable
            key={`hotel-${i}`}
            onPress={() => h.whatsapp_link && Linking.openURL(h.whatsapp_link)}
            style={styles.item}
          >
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
  content: { padding: 20 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b0b0b",
    padding: 20,
  },
  loadingText: { color: "#fff", marginTop: 10 },
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
    fontSize: 16,
  },
  item: {
    marginBottom: 8,
  },
  link: { color: "#4da3ff" },
  empty: { color: "#777", marginBottom: 10 },
});