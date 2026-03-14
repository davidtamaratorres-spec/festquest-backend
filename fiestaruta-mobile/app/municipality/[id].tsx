import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
// Asegúrate de que esta ruta sea la correcta hacia tu servicio
import { fetchFestivalsByMunicipalityId } from "../../services/festivalsByMunicipalityId";

export default function MunicipalityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); 
  const router = useRouter();
  const BASE_URL = "https://festquest-backend.onrender.com/api";

  // Aquí definimos las variables que VS Code decía que no encontraba
  const [festivals, setFestivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        // Llamamos al servicio. El 'id' viene de la URL (ej: 50001)
        const response = await fetchFestivalsByMunicipalityId(BASE_URL, id);
        
        // Como vimos en tu captura que los datos vienen en .data, 
        // el servicio ya debería retornar ese array.
        setFestivals(Array.isArray(response) ? response : []);
      } catch (err: any) {
        setError("Error al conectar con el servidor");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#FF6A00" />
      <Text>Buscando festivales...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backTxt}>← Volver</Text>
      </Pressable>

      <Text style={styles.title}>Resultados para: {id}</Text>

      {error ? (
        <Text style={styles.err}>{error}</Text>
      ) : (
        <FlatList
          data={festivals}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.muni}>{item.municipio || "Sin nombre"}</Text>
              <Text style={styles.fest}>🎉 {item.festival}</Text>
              <Text style={styles.info}>📍 {item.departamento} | 🏔️ {item.altura}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No se encontraron festivales para "{id}".</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  back: { marginBottom: 20 },
  backTxt: { color: '#FF6A00', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  card: { padding: 15, backgroundColor: '#F5F5F5', borderRadius: 12, marginBottom: 15, borderLeftWidth: 5, borderLeftColor: '#FF6A00' },
  muni: { fontSize: 18, fontWeight: 'bold' },
  fest: { color: '#E67E22', fontWeight: 'bold', marginVertical: 5, fontSize: 16 },
  info: { color: '#666', fontSize: 13 },
  err: { color: 'red', textAlign: 'center', marginTop: 20 },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});