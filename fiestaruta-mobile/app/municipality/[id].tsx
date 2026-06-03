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
import { BASE_URL } from "../../services/backendApi";

type MunicipioRow = {
  id: number;
  nombre: string;
  departamento: string;
  subregion?: string | null;
  habitantes?: number | null;
  temperatura_promedio?: number | null;
  altura?: number | null;
  gentilicio?: string | null;
  alcalde?: string | null;
  correo_alcalde?: string | null;
};

type Place = { nombre: string; maps_link: string };
type Hotel = { nombre: string; whatsapp_link: string };

async function openURL(url: string) {
  let final = url.trim();
  if (!/^https?:\/\//i.test(final)) final = `https://${final}`;
  try { await Linking.openURL(final); } catch {}
}

export default function MunicipalityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [municipio, setMunicipio] = useState<MunicipioRow | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${BASE_URL}/municipalities/${id}`);
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setMunicipio(json.municipio ?? json);
        setPlaces(json.places ?? []);
        setHotels(json.hotels ?? []);
      } catch {
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
        <Text style={styles.muted}>Cargando municipio...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: "#FF6A00" }}>← Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (!municipio) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No se encontró información</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Volver</Text>
      </Pressable>

      <Text style={styles.title}>{municipio.nombre}</Text>
      {municipio.gentilicio ? (
        <Text style={styles.gentilicio}>{municipio.gentilicio}</Text>
      ) : null}
      <Text style={styles.subtitle}>
        {municipio.departamento}
        {municipio.subregion ? ` · ${municipio.subregion}` : ""}
      </Text>

      <View style={styles.statsRow}>
        {municipio.habitantes ? (
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Habitantes</Text>
            <Text style={styles.chipValue}>
              {Number(municipio.habitantes).toLocaleString("es-CO")}
            </Text>
          </View>
        ) : null}
        {municipio.temperatura_promedio ? (
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Temperatura</Text>
            <Text style={styles.chipValue}>{municipio.temperatura_promedio}°C</Text>
          </View>
        ) : null}
        {municipio.altura ? (
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Altura</Text>
            <Text style={styles.chipValue}>
              {Number(municipio.altura).toLocaleString("es-CO")} msnm
            </Text>
          </View>
        ) : null}
      </View>

      {(municipio.alcalde || municipio.correo_alcalde) ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ALCALDE / MANDATARIO</Text>
          {municipio.alcalde ? (
            <Text style={styles.body}>{municipio.alcalde}</Text>
          ) : null}
          {municipio.correo_alcalde ? (
            <Pressable onPress={() => Linking.openURL(`mailto:${municipio.correo_alcalde}`)}>
              <Text style={[styles.body, styles.link]}>{municipio.correo_alcalde}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {places.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SITIOS TURÍSTICOS</Text>
          {places.map((p, i) => (
            <Pressable
              key={i}
              style={styles.listItem}
              onPress={() => openURL(p.maps_link)}
            >
              <Text style={styles.listItemText}>{p.nombre}</Text>
              <Text style={styles.listItemAction}>Ver en mapa →</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {hotels.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOTELES</Text>
          {hotels.map((h, i) => (
            <Pressable
              key={i}
              style={styles.listItem}
              onPress={() => openURL(h.whatsapp_link)}
            >
              <Text style={styles.listItemText}>{h.nombre}</Text>
              <Text style={[styles.listItemAction, { color: "#25D366" }]}>WhatsApp →</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0b" },
  content: { padding: 20, paddingBottom: 48 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b0b0b",
    padding: 20,
  },
  errorText: { color: "#ff6b6b", textAlign: "center" },
  muted: { color: "#fff", marginTop: 10 },
  back: { color: "#FF6A00", marginBottom: 16, fontSize: 15 },
  title: { color: "#fff", fontSize: 26, fontWeight: "900", marginBottom: 2 },
  gentilicio: { color: "#FF6A00", fontSize: 13, marginBottom: 4 },
  subtitle: { color: "#aaa", marginBottom: 16, fontSize: 14 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: {
    backgroundColor: "#141414",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#222",
    minWidth: "30%",
    flex: 1,
  },
  chipLabel: { color: "#FF6A00", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  chipValue: { color: "#fff", fontSize: 13, fontWeight: "600", marginTop: 2 },
  section: { marginTop: 22 },
  sectionLabel: {
    color: "#FF6A00",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  body: { color: "#ccc", fontSize: 14, lineHeight: 22 },
  link: { color: "#FF6A00", textDecorationLine: "underline" },
  listItem: {
    backgroundColor: "#141414",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  listItemText: { color: "#ddd", fontSize: 13, flex: 1 },
  listItemAction: { color: "#FF6A00", fontSize: 11, marginLeft: 8, flexShrink: 0 },
});
