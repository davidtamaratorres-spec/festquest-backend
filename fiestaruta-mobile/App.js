import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  ScrollView,
  Linking,
} from "react-native";

import {
  fetchMunicipalities,
  fetchMunicipalityDetail,
} from "./services/backendApi";

export default function App() {
  const [municipalities, setMunicipalities] = useState([]);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMunicipalities();
  }, []);

  async function loadMunicipalities() {
    try {
      setLoading(true);
      const data = await fetchMunicipalities();
      setMunicipalities(data);
    } catch (error) {
      console.error("Error cargando municipios:", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMunicipalityDetail(id) {
    try {
      setLoading(true);
      const data = await fetchMunicipalityDetail(id);
      setDetail(data);
      setSelectedMunicipalityId(id);
    } catch (error) {
      console.error("Error cargando detalle:", error.message);
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setSelectedMunicipalityId(null);
    setDetail(null);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Cargando...</Text>
      </View>
    );
  }

  if (selectedMunicipalityId && detail) {
    const { municipio, places, hotels } = detail;

    return (
      <ScrollView style={styles.container}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </Pressable>

        <Text style={styles.title}>{municipio.nombre}</Text>
        <Text style={styles.subtitle}>{municipio.departamento}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos generales</Text>
          <Text>Subregión: {municipio.subregion || "Sin dato"}</Text>
          <Text>Habitantes: {municipio.habitantes || "Sin dato"}</Text>
          <Text>
            Temperatura: {municipio.temperatura_promedio || "Sin dato"}
          </Text>
          <Text>Altura: {municipio.altura || "Sin dato"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lugares</Text>
          {places && places.length > 0 ? (
            places.map((place) => (
              <View key={place.id} style={styles.card}>
                <Text style={styles.cardTitle}>{place.nombre}</Text>
                {place.maps_link ? (
                  <Pressable onPress={() => Linking.openURL(place.maps_link)}>
                    <Text style={styles.link}>Abrir en Maps</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          ) : (
            <Text>Sin lugares registrados.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hoteles</Text>
          {hotels && hotels.length > 0 ? (
            hotels.map((hotel) => (
              <View key={hotel.id} style={styles.card}>
                <Text style={styles.cardTitle}>{hotel.nombre}</Text>
                {hotel.whatsapp_link ? (
                  <Pressable
                    onPress={() => Linking.openURL(hotel.whatsapp_link)}
                  >
                    <Text style={styles.link}>Abrir WhatsApp</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          ) : (
            <Text>Sin hoteles registrados.</Text>
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FestQuest</Text>

      <FlatList
        data={municipalities}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => loadMunicipalityDetail(item.id)}
          >
            <Text style={styles.cardTitle}>{item.nombre}</Text>
            <Text style={styles.cardSubtitle}>{item.departamento}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    color: "blue",
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 16,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  link: {
    color: "blue",
    marginTop: 6,
  },
});