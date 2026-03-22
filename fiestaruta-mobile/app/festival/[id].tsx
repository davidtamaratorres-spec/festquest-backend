import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

type FestivalDetailData = {
  id: number;
  nombre?: string;
  municipio?: string;
  departamento?: string;
  fecha?: string;
  subregion?: string | null;
  habitantes?: string | number | null;
  temperatura_promedio?: string | number | null;
  altura?: string | number | null;
  sitios_turisticos?: string | null;
  hoteles?: string | null;
  contacto_hoteles?: string | null;
  municipio_id?: number | null;
};

function splitPipe(value: any) {
  if (!value) return [];
  return String(value)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function FestivalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<FestivalDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!id) {
      setErrorText("ID de festival inválido.");
      setLoading(false);
      return;
    }

    async function loadFestival() {
      try {
        setLoading(true);
        setErrorText("");

        const response = await fetch(
          `https://festquest-backend.onrender.com/api/festivals/${id}`
        );

        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status}`);
        }

        const json = await response.json();
        setData(json);
      } catch (error) {
        console.log("Error cargando festival:", error);
        setData(null);
        setErrorText("No se pudo cargar el detalle del festival.");
      } finally {
        setLoading(false);
      }
    }

    loadFestival();
  }, [id]);

  const abrirLink = async (url?: string | null) => {
    if (!url) return;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.log("URL no compatible:", url);
      }
    } catch (error) {
      console.log("Error abriendo URL:", error);
    }
  };

  const lugares = useMemo(() => {
    if (!data) return [];

    const nombres = splitPipe(data.sitios_turisticos);

    return nombres.map((nombre: string) => ({
      nombre,
      maps_link: `https://www.google.com/maps/search/${encodeURIComponent(
        `${nombre}, ${data.municipio || ""}, ${data.departamento || ""}, Colombia`
      )}`,
    }));
  }, [data]);

  const hoteles = useMemo(() => {
    if (!data) return [];

    const nombres = splitPipe(data.hoteles);
    const contactos = splitPipe(data.contacto_hoteles);

    return nombres.map((nombre: string, i: number) => ({
      nombre,
      whatsapp_link:
        contactos[i] ||
        `https://www.google.com/search?q=${encodeURIComponent(
          `${nombre} ${data.municipio || ""} ${data.departamento || ""} whatsapp`
        )}`,
    }));
  }, [data]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6A00" />
        <Text style={styles.loadingText}>Cargando festival...</Text>
      </View>
    );
  }

  if (errorText) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{errorText}</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se encontró el festival.</Text>
      </View>
    );
  }

  const municipioIdReal =
    data.municipio_id && !Number.isNaN(Number(data.municipio_id))
      ? Number(data.municipio_id)
      : null;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{data.nombre || "Festival"}</Text>

      <Text style={styles.subtitle}>
        {data.municipio || "Sin municipio"} · {data.departamento || "Sin departamento"}
      </Text>

      <Text style={styles.date}>📅 {data.fecha || "Sin fecha"}</Text>

      <View style={styles.infoBox}>
        <Text style={styles.info}>
          🌎 Subregión: {data.subregion || "Sin dato"}
        </Text>
        <Text style={styles.info}>
          👥 Habitantes: {data.habitantes || "Sin dato"}
        </Text>
        <Text style={styles.info}>
          🌡 Temperatura promedio: {data.temperatura_promedio || "Sin dato"}
        </Text>
        <Text style={styles.info}>⛰ Altura: {data.altura || "Sin dato"}</Text>
      </View>

      <Text style={styles.section}>Sitios recomendados</Text>

      {lugares.length ? (
        lugares.map((item, index) => (
          <Pressable key={`lugar-${index}`} onPress={() => abrirLink(item.maps_link)}>
            <Text style={styles.link}>📍 {item.nombre}</Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.emptyText}>No hay sitios registrados.</Text>
      )}

      <Text style={styles.section}>Hoteles</Text>

      {hoteles.length ? (
        hoteles.map((item, index) => (
          <Pressable key={`hotel-${index}`} onPress={() => abrirLink(item.whatsapp_link)}>
            <Text style={styles.link}>🏨 {item.nombre}</Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.emptyText}>No hay hoteles registrados.</Text>
      )}

      {municipioIdReal ? (
        <Pressable
          style={styles.button}
          onPress={() => router.push(`/municipality/${municipioIdReal}`)}
        >
          <Text style={styles.buttonText}>Ver municipio</Text>
        </Pressable>
      ) : (
        <Text style={styles.errorMini}>
          No hay municipio asociado para navegar.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0b0b0b",
  },

  content: {
    padding: 16,
    paddingBottom: 30,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b0b0b",
    paddingHorizontal: 24,
  },

  loadingText: {
    color: "#ddd",
    marginTop: 12,
    fontSize: 14,
  },

  errorText: {
    color: "white",
    fontSize: 15,
    textAlign: "center",
  },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "white",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 16,
    color: "#aaa",
    marginBottom: 10,
  },

  date: {
    color: "#FF6A00",
    fontSize: 16,
    marginBottom: 20,
  },

  infoBox: {
    backgroundColor: "#141414",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },

  info: {
    color: "#ddd",
    marginBottom: 6,
  },

  section: {
    color: "#FF6A00",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 6,
  },

  link: {
    color: "#4da3ff",
    marginBottom: 8,
  },

  emptyText: {
    color: "#888",
    marginBottom: 14,
  },

  button: {
    marginTop: 10,
    backgroundColor: "#FF6A00",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontWeight: "900",
  },

  errorMini: {
    color: "#ff8a8a",
    marginTop: 14,
  },
});