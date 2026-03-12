import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function MunicipalityDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setLoading(true);
      setError(null);
      
      // Intentamos conectar con la API de Render
      fetch(`https://festquest-backend.onrender.com/api/municipalities/${id}`)
        .then(async (res) => {
          if (!res.ok) throw new Error(`Servidor respondió con error ${res.status}`);
          return res.json();
        })
        .then(json => {
          setData(json);
        })
        .catch(err => {
          console.log("Error de red:", err);
          setError("El servidor está despertando o fuera de línea. Reintenta en un momento.");
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#FF6A00" />
      <Text style={styles.gray}>Conectando con el servidor...</Text>
    </View>
  );

  if (error || !data) return (
    <View style={styles.center}>
      <Text style={styles.err}>⚠️ {error || "No se encontraron datos"}</Text>
      <Pressable onPress={() => router.back()} style={styles.btnVolver}>
        <Text style={{color: 'white', fontWeight: 'bold'}}>Regresar y reintentar</Text>
      </Pressable>
    </View>
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ padding: 14 }}>
      {/* Ahora sí mostrará el nombre real si el fetch funciona */}
      <Text style={styles.h1}>{data.nombre}</Text>
      <Text style={styles.h2}>{data.departamento}</Text>

      <View style={styles.card}>
        <Text style={styles.k}>Descripción del Municipio</Text>
        <Text style={styles.v}>{data.descripcion || "Sin descripción disponible."}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowK}>Temperatura Promedio</Text>
          <Text style={styles.rowV}>{data.temperatura_prom ? `${data.temperatura_prom} °C` : "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowK}>Altitud</Text>
          <Text style={styles.rowV}>{data.altitud_msnm ? `${data.altitud_msnm} msnm` : "—"}</Text>
        </View>
      </View>

      <Text style={styles.gray}>ID de búsqueda: {id}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0b0b0b" },
  center: { flex: 1, backgroundColor: "#0b0b0b", justifyContent: "center", alignItems: "center", padding: 20 },
  h1: { color: "white", fontSize: 28, fontWeight: "900" },
  h2: { color: "#FF6A00", fontSize: 18, marginBottom: 20, fontWeight: "700" },
  card: { backgroundColor: "#141414", borderRadius: 16, padding: 15, borderWidth: 1, borderColor: "#232323", marginBottom: 15 },
  k: { color: "#9a9a9a", fontWeight: "900", marginBottom: 5, textTransform: 'uppercase', fontSize: 11 },
  v: { color: "#e6e6e6", fontSize: 16, lineHeight: 22 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#222' },
  rowK: { color: '#9a9a9a' },
  rowV: { color: '#fff', fontWeight: 'bold' },
  gray: { color: "#444", marginTop: 20, textAlign: 'center', fontSize: 12 },
  err: { color: "#FF7777", fontWeight: "900", textAlign: 'center', marginBottom: 20 },
  btnVolver: { backgroundColor: '#333', padding: 15, borderRadius: 10 }
});