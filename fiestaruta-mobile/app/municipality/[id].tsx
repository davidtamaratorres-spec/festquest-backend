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
      // Conexión al backend de FestQuest
      const url = `https://festquest-backend.onrender.com/api/municipalities/${id}?t=${new Date().getTime()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: Problemas con el servidor`);
      }

      const json = await response.json();
      const muniData = json.data ? json.data : json;
      
      if (!muniData || !muniData.nombre) {
        throw new Error("No se encontró el municipio");
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
      <Text style={styles.gray}>Cargando detalles de FestQuest...</Text>
    </View>
  );

  if (error || !data) return (
    <View style={styles.center}>
      <Text style={styles.err}>⚠️ {error}</Text>
      <Pressable onPress={cargarDatos} style={styles.btnReintento}>
        <Text style={{color: 'white', fontWeight: 'bold'}}>REINTENTAR</Text>
      </Pressable>
    </View>
  );

  // Lógica para evitar valores vacíos (Lógica regional)
  const climaFinal = data.temperatura_prom || 
    (data.departamento === 'Atlántico' ? '28' : 
     data.departamento === 'Antioquia' ? '22' : '18');

  const altitudFinal = data.altitud_msnm || 
    (data.departamento === 'Atlántico' ? '50' : '1500');

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
      {/* BOTÓN VOLVER */}
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Volver a la ruta</Text>
      </Pressable>

      {/* CABECERA DEL MUNICIPIO */}
      <Text style={styles.h1}>{data.nombre}</Text>
      <Text style={styles.h2}>{data.departamento}</Text>

      {/* CARD DE INFORMACIÓN GENERAL */}
      <View style={styles.card}>
        <Text style={styles.k}>Acerca de este municipio</Text>
        <Text style={styles.v}>
          {data.descripcion || `Bienvenido a ${data.nombre}, un destino lleno de cultura y tradición en el departamento de ${data.departamento}.`}
        </Text>
      </View>

      {/* DATOS TÉCNICOS */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowK}>Clima promedio</Text>
          <Text style={styles.rowV}>{climaFinal}°C</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowK}>Altitud</Text>
          <Text style={styles.rowV}>{altitudFinal} msnm</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowK}>Eventos Registrados</Text>
          <Text style={styles.rowV}>{data.festivalsCount || "1"}</Text>
        </View>
      </View>

      {/* --- MÓDULO FESTQUEST --- */}
      <Pressable 
        onPress={() => router.push(`/municipality/${id}/festivals`)} 
        style={styles.btnFestivales}
      >
        <View>
          <Text style={styles.btnFestivalesText}>Festivales Culturales</Text>
          <Text style={styles.btnFestivalesSub}>Agenda de ferias y fiestas tradicionales</Text>
        </View>
        <Text style={styles.arrowIcon}>→</Text>
      </Pressable>

      {/* --- MÓDULO DISHQUEST --- */}
      <Pressable 
        onPress={() => router.push(`/municipality/${id}/dishes`)} 
        style={[styles.btnFestivales, { backgroundColor: '#222', marginTop: 15, borderColor: '#FF6A00', borderWidth: 1 }]}
      >
        <View>
          <Text style={styles.btnFestivalesText}>Gastronomía Local</Text>
          <Text style={styles.btnFestivalesSub}>Platos típicos y restaurantes recomendados</Text>
        </View>
        <Text style={styles.arrowIcon}>→</Text>
      </Pressable>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0b0b0b" },
  center: { flex: 1, backgroundColor: "#0b0b0b", justifyContent: "center", alignItems: "center", padding: 30 },
  backBtn: { marginBottom: 20, paddingTop: 40 },
  backBtnText: { color: "#FF6A00", fontWeight: "bold", fontSize: 16 },
  h1: { color: "white", fontSize: 36, fontWeight: "900", letterSpacing: -1 },
  h2: { color: "#FF6A00", fontSize: 18, marginBottom: 25, fontWeight: "700", textTransform: 'uppercase', letterSpacing: 2 },
  card: { backgroundColor: "#141414", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#232323", marginBottom: 15 },
  k: { color: "#666", fontWeight: "900", marginBottom: 8, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 },
  v: { color: "#e6e6e6", fontSize: 16, lineHeight: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1f1f1f' },
  rowK: { color: '#9a9a9a', fontSize: 15 },
  rowV: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  gray: { color: "#666", marginTop: 20 },
  err: { color: "#FF7777", fontWeight: "900", textAlign: 'center', marginBottom: 20 },
  btnReintento: { backgroundColor: '#FF6A00', padding: 15, borderRadius: 12, width: '100%', alignItems: 'center' },
  
  // Estilos nuevos para los botones de los módulos
  btnFestivales: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: "#FF6A00",
    borderRadius: 20,
    padding: 25,
    marginTop: 10,
    elevation: 8,
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  btnFestivalesText: {
    color: "white",
    fontSize: 20,
    fontWeight: "900",
  },
  btnFestivalesSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 4,
  },
  arrowIcon: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold'
  }
});