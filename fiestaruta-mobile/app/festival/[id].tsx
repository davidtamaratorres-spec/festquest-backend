import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function FestivalDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Conexión directa a Render
    fetch(`https://festquest-backend.onrender.com/api/festivals/${id}`)
      .then(res => res.json())
      .then(json => setData(json))
      .catch(err => console.log("Error:", err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#FF6A00" /></View>
  );

  if (!data) return (
    <View style={styles.center}><Text style={{color:'white'}}>No se encontró el festival</Text></View>
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ padding: 14 }}>
      <Text style={styles.h1}>{data.nombre}</Text>
      
      <View style={styles.card}>
        <Text style={styles.k}>Municipio</Text>
        {/* Usamos municipio_nombre que es el que viene de la DB */}
        <Text style={styles.v}>{data.municipio_nombre || "Sutamarchán"}</Text>
        
        <Text style={styles.k}>Departamento</Text>
        <Text style={styles.v}>{data.departamento || "Boyacá"}</Text>

        <Text style={styles.k}>Fecha</Text>
        <Text style={styles.v}>{new Date(data.fecha_inicio).toLocaleDateString()}</Text>
      </View>

      <Pressable 
        style={styles.btn} 
        onPress={() => router.push({ 
          pathname: "/municipality/[id]", 
          params: { id: String(data.municipio_id || 215) } 
        })}
      >
        <Text style={styles.btnText}>Ver municipio</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0b0b0b" },
  center: { flex: 1, backgroundColor: "#0b0b0b", justifyContent: "center", alignItems: "center" },
  h1: { color: "white", fontSize: 24, fontWeight: "900", marginBottom: 15 },
  card: { backgroundColor: "#141414", borderRadius: 14, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  k: { color: "#9a9a9a", fontWeight: "900", fontSize: 12, textTransform: 'uppercase' },
  v: { color: "#e6e6e6", fontSize: 18, marginBottom: 10, fontWeight: '700' },
  btn: { backgroundColor: "#FF6A00", padding: 15, borderRadius: 14, alignItems: "center" },
  btnText: { color: "white", fontWeight: "900", fontSize: 16 }
});