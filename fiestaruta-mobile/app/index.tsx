import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { fetchFestivals, FestivalItem } from "../services/festivals";

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function fechaSoloDia(fecha?: string | null) {
  if (!fecha) return "";
  return String(fecha).split("T")[0].trim();
}

function obtenerFechaInicio(item: any) {
  return fechaSoloDia(item?.date_start || item?.fecha_inicio || item?.fecha || "");
}

function isPast(item: any): boolean {
  const end = item.date_end || item.fecha_fin;
  if (!end) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(String(end).split("T")[0]) < today;
}

function sortFestivals(data: any[]): any[] {
  const upcoming: any[] = [];
  const past: any[] = [];
  for (const item of data) {
    if (isPast(item)) past.push(item);
    else upcoming.push(item);
  }
  return [...upcoming, ...past];
}

function normalizarTexto(texto?: string | null) {
  return String(texto || "")
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function limpiarInput(texto?: string | null) {
  return String(texto || "")
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


export default function Home() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FestivalItem[]>([]);
  const [allItems, setAllItems] = useState<FestivalItem[]>([]);
  const [errorText, setErrorText] = useState("");

  const [departamento, setDepartamento] = useState("");
  const [municipio, setMunicipio] = useState("");

  const [mes, setMes] = useState<number | null>(null);

  const [departamentoFocus, setDepartamentoFocus] = useState(false);
  const [municipioFocus, setMunicipioFocus] = useState(false);

  const cargarTodos = async () => {
    setLoading(true);
    setErrorText("");

    try {
      const resp = await fetchFestivals({});
      const data = Array.isArray(resp) ? resp : [];
      setAllItems(data);
      setItems(sortFestivals(data));
    } catch (e: any) {
      console.error("Error:", e);
      setAllItems([]);
      setItems([]);
      setErrorText("No se pudieron cargar los festivales.");
    } finally {
      setLoading(false);
    }
  };

  const buscarConFiltros = async () => {
    Keyboard.dismiss();
    setLoading(true);
    setErrorText("");

    try {
      const depLimpio = limpiarInput(departamento);
      const munLimpio = limpiarInput(municipio);

      setDepartamento(depLimpio);
      setMunicipio(munLimpio);
      setDepartamentoFocus(false);
      setMunicipioFocus(false);

      const resp = await fetchFestivals({
        departamento: depLimpio || undefined,
        municipio: munLimpio || undefined,
      });

      setItems(sortFestivals(Array.isArray(resp) ? resp : []));
    } catch (e: any) {
      console.error("Error:", e);
      setItems([]);
      setErrorText("No se pudieron cargar los festivales.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodos();
  }, []);

  const departamentosDisponibles = useMemo(() => {
    const lista = allItems
      .map((i: any) => limpiarInput(i.departamento))
      .filter(Boolean);

    return Array.from(new Set(lista)).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const municipiosDisponibles = useMemo(() => {
    const depFiltro = normalizarTexto(departamento);

    const lista = allItems
      .filter((i: any) => {
        if (!depFiltro) return true;
        return normalizarTexto(i.departamento) === depFiltro;
      })
      .map((i: any) => limpiarInput(i.municipio))
      .filter(Boolean);

    return Array.from(new Set(lista)).sort((a, b) => a.localeCompare(b));
  }, [allItems, departamento]);

  const sugerenciasDepartamento = useMemo(() => {
    const depFiltro = normalizarTexto(departamento);

    if (!departamentoFocus || !depFiltro) return [];

    return departamentosDisponibles
      .filter((d) => normalizarTexto(d).includes(depFiltro))
      .slice(0, 6);
  }, [departamento, departamentoFocus, departamentosDisponibles]);

  const sugerenciasMunicipio = useMemo(() => {
    const munFiltro = normalizarTexto(municipio);

    if (!municipioFocus || !munFiltro) return [];

    return municipiosDisponibles
      .filter((m) => normalizarTexto(m).includes(munFiltro))
      .slice(0, 6);
  }, [municipio, municipioFocus, municipiosDisponibles]);

  const seleccionarMes = async (numMes: number | null) => {
    setMes(numMes);
    if (numMes === null) {
      cargarTodos();
      return;
    }
    const ultimoDia = new Date(2026, numMes, 0).getDate();
    const mm = String(numMes).padStart(2, "0");
    const inicio = `2026-${mm}-01`;
    const fin = `2026-${mm}-${String(ultimoDia).padStart(2, "0")}`;
    setLoading(true);
    setErrorText("");
    try {
      const resp = await fetchFestivals({
        departamento: limpiarInput(departamento) || undefined,
        municipio: limpiarInput(municipio) || undefined,
        fecha_inicio: inicio,
        fecha_fin: fin,
      });
      setItems(sortFestivals(Array.isArray(resp) ? resp : []));
    } catch {
      setItems([]);
      setErrorText("No se pudieron cargar los festivales.");
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setDepartamento("");
    setMunicipio("");
    setMes(null);
    setDepartamentoFocus(false);
    setMunicipioFocus(false);
    cargarTodos();
  };

  const seleccionarDepartamento = (valor: string) => {
    const limpio = limpiarInput(valor);
    setDepartamento(limpio);
    setMunicipio("");
    setDepartamentoFocus(false);
  };

  const seleccionarMunicipio = (valor: string) => {
    const limpio = limpiarInput(valor);
    setMunicipio(limpio);
    setMunicipioFocus(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.fixedHeader}>
        <Text style={styles.brandTitle}>FestQuest</Text>
        <Text style={styles.mainTitle}>Festividades</Text>

        <View style={styles.filterBox}>
          <View style={styles.autoBox}>
            <TextInput
              placeholder="Departamento"
              placeholderTextColor="#666"
              style={styles.inputSmall}
              value={departamento}
              onFocus={() => setDepartamentoFocus(true)}
              onChangeText={(text) => setDepartamento(text)}
              onBlur={() => {
                setTimeout(() => {
                  setDepartamento((prev) => limpiarInput(prev));
                  setDepartamentoFocus(false);
                }, 150);
              }}
              onSubmitEditing={buscarConFiltros}
              returnKeyType="search"
              multiline={false}
              blurOnSubmit={true}
              autoCapitalize="words"
            />

            {sugerenciasDepartamento.length > 0 && (
              <View style={styles.suggestionsBox}>
                {sugerenciasDepartamento.map((item, index) => (
                  <Pressable
                    key={`${item}-${index}`}
                    style={[
                      styles.suggestionItem,
                      index === sugerenciasDepartamento.length - 1
                        ? styles.suggestionItemLast
                        : null,
                    ]}
                    onPress={() => seleccionarDepartamento(item)}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.autoBox}>
            <TextInput
              placeholder="Municipio"
              placeholderTextColor="#666"
              style={styles.inputSmall}
              value={municipio}
              onFocus={() => setMunicipioFocus(true)}
              onChangeText={(text) => setMunicipio(text)}
              onBlur={() => {
                setTimeout(() => {
                  setMunicipio((prev) => limpiarInput(prev));
                  setMunicipioFocus(false);
                }, 150);
              }}
              onSubmitEditing={buscarConFiltros}
              returnKeyType="search"
              multiline={false}
              blurOnSubmit={true}
              autoCapitalize="words"
            />

            {sugerenciasMunicipio.length > 0 && (
              <View style={styles.suggestionsBox}>
                {sugerenciasMunicipio.map((item, index) => (
                  <Pressable
                    key={`${item}-${index}`}
                    style={[
                      styles.suggestionItem,
                      index === sugerenciasMunicipio.length - 1
                        ? styles.suggestionItemLast
                        : null,
                    ]}
                    onPress={() => seleccionarMunicipio(item)}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mesesScroll}
            keyboardShouldPersistTaps="handled"
          >
            {MESES.map((nombre, i) => {
              const numMes = i + 1;
              const activo = mes === numMes;
              return (
                <Pressable
                  key={numMes}
                  style={[styles.mesChip, activo && styles.mesChipActivo]}
                  onPress={() => seleccionarMes(activo ? null : numMes)}
                >
                  <Text style={[styles.mesChipText, activo && styles.mesChipTextActivo]}>
                    {nombre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.row}>
            <Pressable style={styles.btnSearch} onPress={buscarConFiltros}>
              <Text style={styles.btnSearchText}>BUSCAR</Text>
            </Pressable>

            <Pressable style={styles.btnClear} onPress={limpiarFiltros}>
              <Text style={styles.btnClearText}>LIMPIAR</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {errorText ? (
        <View style={styles.errorBlock}>
          <Text style={styles.errorText}>{errorText}</Text>
          <Pressable onPress={cargarTodos} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          !loading ? (
            <Text style={styles.counter}>
              {items.length} {items.length === 1 ? "festival encontrado" : "festivales encontrados"}
            </Text>
          ) : null
        }
        renderItem={({ item }: any) => {
          const past = isPast(item);
          return (
            <Pressable
              style={[styles.card, past && styles.cardPast]}
              onPress={() => router.push(`/festival/${item.id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, past && styles.cardTitlePast]} numberOfLines={2}>
                  {item.festival || item.nombre}
                </Text>
                {past && (
                  <View style={styles.badgePast}>
                    <Text style={styles.badgePastText}>Pasado</Text>
                  </View>
                )}
              </View>

              <Text style={styles.cardDate}>
                📅 {obtenerFechaInicio(item)}
              </Text>

              <Text style={styles.cardDept}>
                📍 {item.departamento} • {item.municipio}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>No hay resultados</Text>
          ) : null
        }
      />

      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#FF6A00" />
          <Text style={styles.loadingText}>Cargando festivales...</Text>
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
    zIndex: 20,
    elevation: 20,
  },

  brandTitle: {
    color: "#666",
    fontSize: 10,
    textAlign: "center",
  },

  mainTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 15,
  },

  filterBox: {
    gap: 8,
  },

  autoBox: {
    position: "relative",
    zIndex: 30,
  },

  row: {
    flexDirection: "row",
    gap: 8,
  },

  inputSmall: {
    backgroundColor: "#000",
    borderRadius: 8,
    padding: 10,
    color: "white",
    borderWidth: 1,
    borderColor: "#333",
  },


  suggestionsBox: {
    backgroundColor: "#111",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
    marginTop: 4,
    overflow: "hidden",
  },

  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },

  suggestionItemLast: {
    borderBottomWidth: 0,
  },

  suggestionText: {
    color: "white",
    fontSize: 13,
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
  },

  btnClearText: {
    color: "#AAA",
    fontWeight: "800",
  },

  listContent: {
    padding: 15,
  },

  card: {
    backgroundColor: "#161616",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  cardPast: {
    opacity: 0.55,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 8,
  },

  cardTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },

  cardTitlePast: {
    color: "#aaa",
  },

  badgePast: {
    backgroundColor: "#2a2a2a",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#444",
    flexShrink: 0,
  },

  badgePastText: {
    color: "#777",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  cardDate: {
    color: "#FF6A00",
    fontSize: 12,
  },

  cardDept: {
    color: "#666",
    fontSize: 11,
  },

  emptyText: {
    color: "#444",
    textAlign: "center",
    marginTop: 40,
  },

  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#aaa",
    marginTop: 12,
    fontSize: 13,
  },

  errorBlock: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
  },

  errorText: {
    color: "#ff6b6b",
    textAlign: "center",
    fontSize: 13,
  },

  retryBtn: {
    marginTop: 10,
    backgroundColor: "#FF6A00",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },

  retryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  mesesScroll: {
    flexDirection: "row",
    paddingVertical: 2,
    gap: 8,
  },

  mesChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
  },

  mesChipActivo: {
    backgroundColor: "#FF6A00",
    borderColor: "#FF6A00",
  },

  mesChipText: {
    color: "#777",
    fontSize: 12,
    fontWeight: "700",
  },

  mesChipTextActivo: {
    color: "white",
  },

  counter: {
    color: "#555",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
  },
});