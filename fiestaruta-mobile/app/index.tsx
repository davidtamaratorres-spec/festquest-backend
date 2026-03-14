import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  StatusBar,
  Platform
} from "react-native";
import { useRouter } from "expo-router";
import { fetchFestivals } from "../services/festivals";

export default function Home() {
  const router = useRouter();
  const BASE_URL = "https://festquest-backend.onrender.com";

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  
  // Estados de los filtros
  const [departamento, setDepartamento] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const calcularDias = (inicio: string, fin: string) => {
    if (!inicio || !fin) return "1";
    try {
      const d1 = new Date(inicio.split('T')[0]);
      const d2 = new Date(fin.split('T')[0]);
      const diff = Math.ceil((d2.getTime() - d1.getTime()) / 86400000) + 1;
      return diff > 0 ? diff : "1";
    } catch (e) { return "1"; }
  };

  const cargarDatos = useCallback(async () => {
    Keyboard.dismiss();
    setLoading(true);
    try {
      const params: any = {
        page: "1",
        pageSize: "50",
        ...(departamento.trim() ? { departamento: departamento.trim() } : {}),
        // Filtros de rango para tus vacaciones
        ...(fechaInicio.trim() ? { fecha_inicio: fechaInicio.trim() } : {}),
        ...(fechaFin.trim() ? { fecha_fin: fechaFin.trim() } : {})
      };
      const resp = await fetchFestivals(BASE_URL, params);
      setItems(resp.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [departamento, fechaInicio, fechaFin]);

  const limpiarFiltros = () => {
    setDepartamento("");
    setFechaInicio("");
    setFechaFin("");
    // Recargamos sin filtros
    setTimeout(() => cargarDatos(), 100);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* CABEZAL FIJO CON RANGO DE FECHAS */}
      <View style={styles.fixedHeader}>
        <Text style={styles.brandTitle}>FiestaRuta</Text>
        <Text style={styles.mainTitle}>Festividades</Text>
        
        <View style={styles.filterBox}>
          <TextInput
            placeholder="Departamento (ej: Huila)"
            placeholderTextColor="#666"
            style={styles.inputSmall}
            value={departamento}
            onChangeText={setDepartamento}
          />
          
          <View style={styles.row}>
            <TextInput
              placeholder="Desde: AAAA-MM-DD"
              placeholderTextColor="#666"
              style={[styles.inputSmall, { flex: 1 }]}
              value={fechaInicio}
              onChangeText={setFechaInicio}
            />
            <TextInput
              placeholder="Hasta: AAAA-MM-DD"
              placeholderTextColor="#666"
              style={[styles.inputSmall, { flex: 1 }]}
              value={fechaFin}
              onChangeText={setFechaFin}
            />
          </View>

          <View style={styles.row}>
            <Pressable style={styles.btnSearch} onPress={cargarDatos}>
              <Text style={styles.btnSearchText}>BUSCAR EVENTOS</Text>
            </Pressable>
            <Pressable style={styles.btnClear} onPress={limpiarFiltros}>
              <Text style={styles.btnClearText}>LIMPIAR</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it, index) => index.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable 
            style={styles.card}
            onPress={() => router.push(`/municipality/${item.municipio_id}`)}
          >
            <Text style={styles.cardTitle}>{item.nombre}</Text>
            
            <View style={styles.infoRow}>
               <Text style={styles.cardDate}>📅 {item.fecha_inicio?.split('T')[0]}</Text>
               <Text style={styles.cardDays}>🎉 {calcularDias(item.fecha_inicio, item.fecha_fin)} Días</Text>
            </View>
            
            <Text style={styles.cardDept}>📍 {item.departamento} • {item.municipio}</Text>
            
            <View style={styles.footerCard}>
                <Text style={styles.detailLink}>Ver municipio →</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>No hay fiestas en esas fechas o lugar.</Text> : null
        }
      />

      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#FF6A00" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  fixedHeader: {
    backgroundColor: "#161616",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderColor: "#222",
  },
  brandTitle: { color: "#666", fontSize: 10, fontWeight: "700", textAlign: "center", marginBottom: 5, letterSpacing: 1 },
  mainTitle: { color: "white", fontSize: 24, fontWeight: "900", marginBottom: 15 },
  
  filterBox: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  inputSmall: { 
    backgroundColor: "#000", 
    borderRadius: 8, 
    padding: 10, 
    color: "white", 
    fontSize: 12,
    borderWidth: 1, 
    borderColor: "#333" 
  },
  btnSearch: { backgroundColor: "#FF6A00", flex: 2, padding: 12, borderRadius: 8, alignItems: "center" },
  btnClear: { backgroundColor: "#333", flex: 1, padding: 12, borderRadius: 8, alignItems: "center" },
  btnSearchText: { color: "white", fontWeight: "800", fontSize: 12 },
  btnClearText: { color: "#AAA", fontWeight: "800", fontSize: 12 },

  listContent: { padding: 15 },
  card: { 
    backgroundColor: "#161616", 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12, 
    borderLeftWidth: 3, 
    borderLeftColor: "#FF6A00" 
  },
  cardTitle: { color: "white", fontSize: 15, fontWeight: "700" },
  infoRow: { flexDirection: 'row', gap: 12, marginVertical: 6 },
  cardDate: { color: "#FF6A00", fontSize: 12, fontWeight: "600" },
  cardDays: { color: "#888", fontSize: 11 },
  cardDept: { color: "#666", fontSize: 11, marginBottom: 8 },
  
  footerCard: { borderTopWidth: 1, borderTopColor: "#222", paddingTop: 8, alignItems: 'flex-end' },
  detailLink: { color: "#FF6A00", fontSize: 11, fontWeight: "bold" },

  emptyText: { color: "#444", textAlign: "center", marginTop: 40, fontSize: 13 },
  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }
});