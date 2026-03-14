import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Pressable,
  StatusBar
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { fetchFestivalsByMunicipalityId } from "../../../services/festivalsByMunicipalityId";

type Festival = {
  id: number;
  municipio_id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  descripcion: string | null;
  municipio_nombre: string;
  departamento: string;
};

export default function MunicipalityFestivals() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const BASE_URL = "http://192.168.1.6:3002";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Festival[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetchFestivalsByMunicipalityId(BASE_URL, id)
      .then((resp: any) => {
        if (!alive) return;
        setRows((resp?.data || []) as Festival[]);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message || "Error cargando la agenda cultural");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.page, styles.center]}>
        <ActivityIndicator size="large" color="#FF6A00" />
        <Text style={styles.loadingText}>Sincronizando con la tradición...</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" />
      
      {/* CABECERA VIBRANTE */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Volver</Text>
        </Pressable>
        <Text style={styles.title}>Agenda Cultural</Text>
        <Text style={styles.subtitle}>{id ? `Festividades en ${id}` : "Descubriendo Colombia"}</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/festival/${item.id}`)}
          >
            <View style={styles.cardAccent} />
            <View style={styles.cardContent}>
              <Text style={styles.name}>{item.nombre}</Text>
              <Text style={styles.location}>📍 {item.municipio_nombre}, {item.departamento}</Text>
              
              <View style={styles.dateBadge}>
                <Text style={styles.dateText}>
                  📅 {item.fecha_inicio} {item.fecha_fin ? `al ${item.fecha_fin}` : ''}
                </Text>
              </View>

              {item.descripcion && (
                <Text style={styles.desc} numberOfLines={3}>
                  {item.descripcion}
                </Text>
              )}
              
              <View style={styles.footerCard}>
                <Text style={styles.moreInfo}>Explorar evento</Text>
                <View style={styles.circleArrow}>
                    <Text style={{color: 'white', fontWeight: 'bold'}}>→</Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Próximamente más eventos</Text>
            <Text style={styles.emptySub}>Estamos actualizando las fechas de las festividades locales.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F7F9FC" }, // Fondo claro y aireado
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 15, color: "#555", fontWeight: "600" },
  
  header: { 
    paddingHorizontal: 25, 
    paddingTop: 60, 
    paddingBottom: 25, 
    backgroundColor: 'white',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  backBtn: { marginBottom: 10 },
  backBtnText: { color: "#FF6A00", fontWeight: "bold", fontSize: 16 },
  title: { color: "#1A1A1A", fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  subtitle: { color: "#7F8C8D", fontSize: 16, fontWeight: "600", textTransform: 'capitalize' },

  card: {
    backgroundColor: "white",
    borderRadius: 25,
    marginBottom: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 6,
    shadowColor: "#FF6A00",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
  },
  cardAccent: { width: 8, backgroundColor: "#FF6A00" }, // Línea de color lateral
  cardContent: { flex: 1, padding: 20 },
  
  name: { color: "#2C3E50", fontSize: 22, fontWeight: "bold", marginBottom: 5 },
  location: { color: "#95A5A6", fontSize: 14, fontWeight: "600", marginBottom: 12 },
  
  dateBadge: { 
    backgroundColor: "#FFF3E0", 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 15
  },
  dateText: { color: "#E67E22", fontWeight: "bold", fontSize: 13 },
  
  desc: { color: "#5D6D7E", fontSize: 14, lineHeight: 21, marginBottom: 15 },
  
  footerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  moreInfo: { color: "#2C3E50", fontWeight: "800", fontSize: 14 },
  circleArrow: { 
    backgroundColor: "#FF6A00", 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  emptyContainer: { padding: 40, alignItems: 'center', marginTop: 50 },
  emptyTitle: { color: "#2C3E50", fontSize: 18, fontWeight: "bold" },
  emptySub: { color: "#95A5A6", textAlign: 'center', marginTop: 10 },
  err: { color: "#E74C3C", fontWeight: "bold", textAlign: 'center' }
});