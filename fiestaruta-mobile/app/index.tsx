import { useEffect, useState } from "react";
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
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { fetchFestivals, FestivalItem } from "../services/festivals";

export default function Home() {
  const router = useRouter();
  const BASE_URL = "https://festquest-backend.onrender.com";

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FestivalItem[]>([]);

  const [departamento, setDepartamento] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const calcularDias = (inicio: string, fin: string | null) => {
    if (!inicio) return "1";
    if (!fin) return "1";

    try {
      const d1 = new Date(inicio.split("T")[0]);
      const d2 = new Date(fin.split("T")[0]);
      const diff = Math.ceil((d2.getTime() - d1.getTime()) / 86400000) + 1;
      return diff > 0 ? String(diff) : "1";
    } catch {
      return "1";
    }
  };

  const estaEnRango = (fechaEvento: string, desde: string, hasta: string) => {
    if (!fechaEvento) return false;

    const evento = fechaEvento.split("T")[0];

    if (desde && evento < desde) return false;
    if (hasta && evento > hasta) return false;

    return true;
  };

  const cargarDatos = async (
    filtros?: {
      departamento?: string;
      fechaInicio?: string;
      fechaFin?: string;
    }
  ) => {
    Keyboard.dismiss();
    setLoading(true);

    try {
      const dep = filtros?.departamento ?? departamento;
      const desde = filtros?.fechaInicio ?? fechaInicio;
      const hasta = filtros?.fechaFin ?? fechaFin;

      const params: Record<string, string> = {
        ...(dep.trim() ? { departamento: dep.trim() } : {}),
      };

      const resp = await fetchFestivals(BASE_URL, params);

      let filtrados = resp || [];

      if (desde.trim() || hasta.trim()) {
        filtrados = filtrados.filter((item) =>
          estaEnRango(item.fecha_inicio, desde.trim(), hasta.trim())
        );
      }

      setItems(filtrados);
    } catch (e) {
      console.error("Error cargando datos:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const buscarConFiltros = () => {
    cargarDatos();
  };

  const limpiarFiltros = async () => {
    const dep = "";
    const desde = "";
    const hasta = "";

    setDepartamento(dep);
    setFechaInicio(desde);
    setFechaFin(hasta);

    await cargarDatos({
      departamento: dep,
      fechaInicio: desde,
      fechaFin: hasta,
    });
  };

  useEffect(() => {
    cargarDatos({
      departamento: "",
      fechaInicio: "",
      fechaFin: "",
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.fixedHeader}>
        <Text style={styles.brandTitle}>FiestaRuta</Text>
        <Text style={styles.mainTitle}>Festividades</Text>

        <View style={styles.filterBox}>
          <TextInput
            placeholder="Departamento (ej: Antioquia)"
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
            <Pressable style={styles.btnSearch} onPress={buscarConFiltros}>
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
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/festival/${item.id}`)}
          >
            <Text style={styles.cardTitle}>{item.nombre}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.cardDate}>
                📅 {item.fecha_inicio || "Sin fecha"}
              </Text>
              <Text style={styles.cardDays}>
                🎉 {calcularDias(item.fecha_inicio, item.fecha_fin)} Días
              </Text>
            </View>

            <Text style={styles.cardDept}>
              📍 {item.departamento} • {item.municipio_nombre}
            </Text>

            <View style={styles.footerCard}>
              <Text style={styles.detailLink}>Ver festival →</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              No hay fiestas para esos filtros.
            </Text>
          ) : null
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

  brandTitle: {
    color: "#666",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 5,
    letterSpacing: 1,
  },

  mainTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 15,
  },

  filterBox: { gap: 8 },

  row: {
    flexDirection: "row",
    gap: 8,
  },

  inputSmall: {
    backgroundColor: "#000",
    borderRadius: 8,
    padding: 10,
    color: "white",
    fontSize: 12,
    borderWidth: 1,
    borderColor: "#333",
  },

  btnSearch: {
    backgroundColor: "#FF6A00",
    flex: 2,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  btnClear: {
    backgroundColor: "#333",
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  btnSearchText: {
    color: "white",
    fontWeight: "800",
    fontSize: 12,
  },

  btnClearText: {
    color: "#AAA",
    fontWeight: "800",
    fontSize: 12,
  },

  listContent: {
    padding: 15,
  },

  card: {
    backgroundColor: "#161616",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#FF6A00",
  },

  cardTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },

  infoRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 6,
  },

  cardDate: {
    color: "#FF6A00",
    fontSize: 12,
    fontWeight: "600",
  },

  cardDays: {
    color: "#888",
    fontSize: 11,
  },

  cardDept: {
    color: "#666",
    fontSize: 11,
    marginBottom: 8,
  },

  footerCard: {
    borderTopWidth: 1,
    borderTopColor: "#222",
    paddingTop: 8,
    alignItems: "flex-end",
  },

  detailLink: {
    color: "#FF6A00",
    fontSize: 11,
    fontWeight: "bold",
  },

  emptyText: {
    color: "#444",
    textAlign: "center",
    marginTop: 40,
    fontSize: 13,
  },

  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
});