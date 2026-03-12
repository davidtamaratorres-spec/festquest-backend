import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { fetchFestivals, FestivalItem } from "../services/festivals";

type Filters = {
  from: string;
  to: string;
  departamento: string;
  onlyHolidays: boolean;
};

// Función para validar fechas (No la borres)
function isValidISODate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export default function Home() {
  const router = useRouter();
  const BASE_URL = "https://festquest-backend.onrender.com";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<FestivalItem[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [draft, setDraft] = useState<Filters>({
    from: "",
    to: "",
    departamento: "",
    onlyHolidays: false,
  });

  const [applied, setApplied] = useState<Filters>({
    from: "",
    to: "",
    departamento: "",
    onlyHolidays: false,
  });

  // ✅ Los parámetros se recalculan cada vez que cambia 'page' o 'applied'
  const params = useMemo(() => {
    const p: Record<string, string> = {
      page: String(page),
      pageSize: String(pageSize),
    };
    if (applied.departamento.trim()) p.departamento = applied.departamento.trim();
    if (applied.from.trim()) p.from = applied.from.trim();
    if (applied.to.trim()) p.to = applied.to.trim();
    if (applied.onlyHolidays) p.onlyHolidays = "1";
    return p;
  }, [page, applied]);

  // ✅ EFECTO PRINCIPAL: Aquí es donde ocurre la magia de la recarga
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetchFestivals(BASE_URL, params)
      .then((resp) => {
        if (!alive) return;
        // Si no vienen datos, mostramos un error amigable
        if (!resp.data || resp.data.length === 0) {
          setItems([]);
          if (page > 1) setError("No hay más festivales en esta página.");
        } else {
          setItems(resp.data);
        }
      })
      .catch((e: any) => {
        if (!alive) return;
        setError("Error al cargar datos. Verifica tu conexión.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => { alive = false; };
  }, [params]); // 🔑 RECARGA AUTOMÁTICA AL CAMBIAR PARÁMETROS

  function applyFilters() {
    Keyboard.dismiss();
    setPage(1); // Siempre resetear a página 1 al filtrar
    setApplied({ ...draft });
  }

  function clearFilters() {
    Keyboard.dismiss();
    setPage(1);
    const empty = { from: "", to: "", departamento: "", onlyHolidays: false };
    setDraft(empty);
    setApplied(empty);
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          data={items}
          keyExtractor={(it, index) => String(it.id || index)}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.h1}>FestQuest 🇨🇴</Text>
              <View style={styles.filtersCard}>
                <TextInput
                  placeholder="Departamento (ej: Antioquia)"
                  placeholderTextColor="#555"
                  style={styles.input}
                  value={draft.departamento}
                  onChangeText={(t) => setDraft({...draft, departamento: t})}
                />
                <View style={styles.btnRow}>
                  <Pressable style={styles.btnPrimary} onPress={applyFilters}><Text style={styles.btnText}>Aplicar</Text></Pressable>
                  <Pressable style={styles.btnSecondary} onPress={clearFilters}><Text style={styles.btnText}>Limpiar</Text></Pressable>
                </View>

                {/* BOTONES DE PAGINACIÓN */}
                <View style={styles.pager}>
                  <Pressable 
                    onPress={() => setPage(p => Math.max(1, p - 1))} 
                    style={[styles.pagerBtn, page === 1 && {opacity: 0.5}]}
                    disabled={page === 1}
                  >
                    <Text style={{color:'white'}}>◀ Ant.</Text>
                  </Pressable>
                  <Text style={{color:'white', fontWeight:'bold'}}>Página {page}</Text>
                  <Pressable 
                    onPress={() => setPage(p => p + 1)} 
                    style={styles.pagerBtn}
                  >
                    <Text style={{color:'white'}}>Sig. ▶</Text>
                  </Pressable>
                </View>
              </View>
              {error && <Text style={styles.errorText}>⚠️ {error}</Text>}
              {loading && <ActivityIndicator color="#FF6A00" style={{marginTop: 15}} />}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/festival/${item.id}`)}>
              <Text style={styles.title}>{item.nombre}</Text>
              <Text style={styles.sub}>{item.municipio_nombre} • {item.departamento}</Text>
              <Text style={styles.dates}>
                {item.fecha_inicio ? item.fecha_inicio.substring(0, 10) : "---"} → {item.fecha_fin ? item.fecha_fin.substring(0, 10) : item.fecha_inicio?.substring(0, 10)}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            !loading && !error ? <Text style={styles.emptyText}>No se encontraron festivales.</Text> : null
          }
        />
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0b" },
  header: { padding: 14 },
  h1: { color: "white", fontSize: 28, fontWeight: "900", marginBottom: 10 },
  filtersCard: { backgroundColor: "#141414", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#232323" },
  input: { backgroundColor: "#0f0f0f", borderWidth: 1, borderColor: "#2a2a2a", borderRadius: 12, padding: 10, color: "white", marginBottom: 10 },
  btnRow: { flexDirection: "row", gap: 10 },
  btnPrimary: { flex: 1, backgroundColor: "#FF6A00", padding: 12, borderRadius: 12, alignItems: "center" },
  btnSecondary: { flex: 1, backgroundColor: "#222", padding: 12, borderRadius: 12, alignItems: "center" },
  btnText: { color: "white", fontWeight: "bold" },
  pager: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 15 },
  pagerBtn: { backgroundColor: "#333", padding: 10, borderRadius: 10 },
  card: { marginHorizontal: 14, backgroundColor: "#141414", borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: "#232323" },
  title: { color: "white", fontSize: 18, fontWeight: "bold" },
  sub: { color: "#aaa", marginTop: 4 },
  dates: { color: "#FF6A00", marginTop: 8, fontSize: 14, fontWeight: "700" },
  errorText: { color: "#FF7777", textAlign: "center", marginTop: 10 },
  emptyText: { color: "#aaa", textAlign: "center", marginTop: 50 }
});