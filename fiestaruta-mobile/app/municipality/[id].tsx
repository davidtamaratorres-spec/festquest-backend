import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function MunicipalityDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    
    try {
      // Añadimos un timestamp para evitar que el celular use datos viejos (cache)
      const url = `https://festquest-backend.onrender.com/api/municipalities/${id}?t=${new Date().getTime()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: El servidor tiene problemas`);
      }

      const json = await response.json();
      console.log("Datos recibidos:", json);

      // Verificamos la estructura del JSON
      const muniData = json.data ? json.data : json;
      
      if (!muniData || !muniData.nombre) {
        throw new Error("El servidor respondió pero no encontró el municipio");
      }
      
      setData(muniData);
    } catch (err: any) {
      setError(err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [id]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#FF6A00" />
      <Text style={styles.gray}>Consultando a Boyacá...</Text>
    </View>
  );

  if (error || !data) return (
    <View style={styles.center}>
      <Text style={styles.err}>⚠️ {error}</Text>
      <Pressable onPress={cargarDatos} style={styles.btnReintento}>
        <Text style={{color: 'white', fontWeight: 'bold'}}>TOCAR PARA REINTENTAR</Text>
      </Pressable>
      <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
        <Text style={{ color: '#999' }}>Regresar al Festival</Text>
      </Pressable>
    </View>
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ padding: 14 }}>
      <Text style={styles.h1}>{data.nombre}</Text>
      <Text style={styles.h2}>{data.departamento}</Text>

      <View style={styles.card}>
        <Text style={styles.k}>Acerca de este municipio</Text>
        <Text style={styles.v}>{data.descripcion || "Sin descripción disponible por ahora."}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowK}>Clima</Text>
          <Text style={styles.rowV}>{data.temperatura_prom ? `${data.temperatura_prom}°C` : "N/A"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowK}>Altitud</Text>
          <Text style={styles.rowV}>{data.altitud_msnm ? `${data.altitud_msnm} msnm` : "N/A"}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0b0b0b" },
  center: { flex: 1, backgroundColor: "#0b0b0b", justifyContent: "center", alignItems: "center", padding: 30 },
  h1: { color: "white", fontSize: 28, fontWeight: "900" },
  h2: { color: "#FF6A00", fontSize: 18, marginBottom: 20, fontWeight: "700" },
  card: { backgroundColor: "#141414", borderRadius: 16, padding: 15, borderWidth: 1, borderColor: "#232323", marginBottom: 15 },
  k: { color: "#9a9a9a", fontWeight: "900", marginBottom: 5, textTransform: 'uppercase', fontSize: 11 },
  v: { color: "#e6e6e6", fontSize: 16, lineHeight: 22 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  rowK: { color: '#9a9a9a' },
  rowV: { color: '#fff', fontWeight: 'bold' },
  gray: { color: "#666", marginTop: 20 },
  err: { color: "#FF7777", fontWeight: "900", textAlign: 'center', marginBottom: 20 },
  btnReintento: { backgroundColor: '#FF6A00', padding: 15, borderRadius: 12, width: '100%', alignItems: 'center' }
});