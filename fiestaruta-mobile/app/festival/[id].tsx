import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function FestivalDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://festquest-backend.onrender.com/api/festivals/${id}`)
      .then(res => res.json())
      .then(json => setData(json))
      .catch(err => console.log(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6A00" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "white" }}>No se encontró el festival</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ padding: 16 }}>

      <Text style={styles.title}>{data.nombre}</Text>

      <Text style={styles.subtitle}>
        {data.municipio} · {data.departamento}
      </Text>

      <Text style={styles.date}>
        📅 {data.fecha}
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.info}>🌎 Subregión: {data.subregion}</Text>
        <Text style={styles.info}>👥 Habitantes: {data.habitantes}</Text>
        <Text style={styles.info}>🌡 Temperatura promedio: {data.temperatura_promedio}°C</Text>
        <Text style={styles.info}>⛰ Altura: {data.altura} m</Text>
      </View>

      <Text style={styles.section}>Sitios recomendados</Text>

      {data.sitio_1 && (
        <Pressable onPress={() => Linking.openURL(data.maps_1)}>
          <Text style={styles.link}>📍 {data.sitio_1}</Text>
        </Pressable>
      )}

      {data.sitio_2 && (
        <Pressable onPress={() => Linking.openURL(data.maps_2)}>
          <Text style={styles.link}>📍 {data.sitio_2}</Text>
        </Pressable>
      )}

      {data.sitio_3 && (
        <Pressable onPress={() => Linking.openURL(data.maps_3)}>
          <Text style={styles.link}>📍 {data.sitio_3}</Text>
        </Pressable>
      )}

      <Text style={styles.section}>Hoteles</Text>

      {data.hotel_1 && (
        <Pressable onPress={() => Linking.openURL(data.wa_1)}>
          <Text style={styles.link}>🏨 {data.hotel_1}</Text>
        </Pressable>
      )}

      {data.hotel_2 && (
        <Pressable onPress={() => Linking.openURL(data.wa_2)}>
          <Text style={styles.link}>🏨 {data.hotel_2}</Text>
        </Pressable>
      )}

      {data.hotel_3 && (
        <Pressable onPress={() => Linking.openURL(data.wa_3)}>
          <Text style={styles.link}>🏨 {data.hotel_3}</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.button}
        onPress={() =>
          router.push({
            pathname: "/municipality/[id]",
            params: { id: String(data.municipio_id) }
          })
        }
      >
        <Text style={styles.buttonText}>Ver municipio</Text>
      </Pressable>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0b0b0b"
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b0b0b"
  },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "white",
    marginBottom: 6
  },

  subtitle: {
    fontSize: 16,
    color: "#aaa",
    marginBottom: 10
  },

  date: {
    color: "#FF6A00",
    fontSize: 16,
    marginBottom: 20
  },

  infoBox: {
    backgroundColor: "#141414",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20
  },

  info: {
    color: "#ddd",
    marginBottom: 6
  },

  section: {
    color: "#FF6A00",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10
  },

  link: {
    color: "#4da3ff",
    marginBottom: 8
  },

  button: {
    marginTop: 30,
    backgroundColor: "#FF6A00",
    padding: 14,
    borderRadius: 12,
    alignItems: "center"
  },

  buttonText: {
    color: "white",
    fontWeight: "900"
  }
});