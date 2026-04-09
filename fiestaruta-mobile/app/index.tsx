import { useEffect, useMemo, useState } from "react";
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
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { fetchFestivals, FestivalItem } from "../services/festivals";

function fechaSoloDia(fecha?: string | null) {
  if (!fecha) return "";
  return String(fecha).split("T")[0].trim();
}

function obtenerFechaInicio(item: any) {
  return fechaSoloDia(item?.date_start || item?.fecha_inicio || item?.fecha || "");
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

function formatearFechaLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function esFechaValida(fecha?: string | null) {
  if (!fecha) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(fechaSoloDia(fecha));
}

export default function Home() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FestivalItem[]>([]);
  const [allItems, setAllItems] = useState<FestivalItem[]>([]);
  const [errorText, setErrorText] = useState("");

  const [departamento, setDepartamento] = useState("");
  const [municipio, setMunicipio] = useState("");

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [showPickerDesde, setShowPickerDesde] = useState(false);
  const [showPickerHasta, setShowPickerHasta] = useState(false);

  const [departamentoFocus, setDepartamentoFocus] = useState(false);
  const [municipioFocus, setMunicipioFocus] = useState(false);

  const cargarTodos = async () => {
    setLoading(true);
    setErrorText("");

    try {
      const resp = await fetchFestivals({});
      const data = Array.isArray(resp) ? resp : [];
      setAllItems(data);
      setItems(data);
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
      const desde = esFechaValida(fechaDesde) ? fechaDesde : undefined;
      const hasta = esFechaValida(fechaHasta) ? fechaHasta : undefined;

      setDepartamento(depLimpio);
      setMunicipio(munLimpio);
      setDepartamentoFocus(false);
      setMunicipioFocus(false);

      console.log("FILTROS:", {
        departamento: depLimpio,
        municipio: munLimpio,
        fecha_inicio: desde,
        fecha_fin: hasta,
      });

      const resp = await fetchFestivals({
        departamento: depLimpio || undefined,
        municipio: munLimpio || undefined,
        fecha_inicio: desde,
        fecha_fin: hasta,
      });

      setItems(Array.isArray(resp) ? resp : []);
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

  const limpiarFiltros = () => {
    setDepartamento("");
    setMunicipio("");
    setFechaDesde("");
    setFechaHasta("");
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
        <Text style={styles.brandTitle}>FiestaRuta</Text>
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

          <View style={styles.row}>
            <Pressable
              style={[styles.inputSmall, styles.dateInput]}
              onPress={() => {
                Keyboard.dismiss();
                setDepartamentoFocus(false);
                setMunicipioFocus(false);
                setShowPickerDesde(true);
              }}
            >
              <Text style={{ color: fechaDesde ? "white" : "#999" }}>
                {fechaDesde || "Fecha desde"}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.inputSmall, styles.dateInput]}
              onPress={() => {
                Keyboard.dismiss();
                setDepartamentoFocus(false);
                setMunicipioFocus(false);
                setShowPickerHasta(true);
              }}
            >
              <Text style={{ color: fechaHasta ? "white" : "#999" }}>
                {fechaHasta || "Fecha hasta"}
              </Text>
            </Pressable>
          </View>

          {showPickerDesde && (
            <DateTimePicker
              value={
                esFechaValida(fechaDesde)
                  ? new Date(`${fechaDesde}T00:00:00`)
                  : new Date()
              }
              mode="date"
              display="default"
              onChange={(event: DateTimePickerEvent, date?: Date) => {
                setShowPickerDesde(false);
                if (date) {
                  setFechaDesde(formatearFechaLocal(date));
                }
              }}
            />
          )}

          {showPickerHasta && (
            <DateTimePicker
              value={
                esFechaValida(fechaHasta)
                  ? new Date(`${fechaHasta}T00:00:00`)
                  : new Date()
              }
              mode="date"
              display="default"
              onChange={(event: DateTimePickerEvent, date?: Date) => {
                setShowPickerHasta(false);
                if (date) {
                  setFechaHasta(formatearFechaLocal(date));
                }
              }}
            />
          )}

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

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }: any) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/festival/${item.id}`)}
          >
            <Text style={styles.cardTitle}>
              {item.festival || item.nombre}
            </Text>

            <Text style={styles.cardDate}>
              📅 {obtenerFechaInicio(item)}
            </Text>

            <Text style={styles.cardDept}>
              📍 {item.departamento} • {item.municipio}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>No hay resultados</Text>
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

  dateInput: {
    flex: 1,
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

  errorText: {
    color: "#ff6b6b",
    textAlign: "center",
    marginTop: 10,
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

  cardTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
});