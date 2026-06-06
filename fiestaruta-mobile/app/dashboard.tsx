import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

type Metric = {
  dishId: string;
  clicks: number;
};

export default function DashboardScreen() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metric[]>([]);

  useEffect(() => {
    const loadMetrics = async () => {
      const keys = await AsyncStorage.getAllKeys();

      const dishKeys = keys.filter((k) =>
        k.startsWith("dish_clicks_")
      );

      const stores = await AsyncStorage.multiGet(dishKeys);

      const parsed: Metric[] = stores.map(([key, value]) => ({
        dishId: key.replace("dish_clicks_", ""),
        clicks: Number(value || 0),
      }));

      setMetrics(parsed);
    };

    loadMetrics();
  }, []);

  const totalClicks = metrics.reduce(
    (sum, m) => sum + m.clicks,
    0
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 Dashboard DishQuest</Text>
      <Text style={styles.subtitle}>
        Resumen de interacciones generadas
      </Text>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryNumber}>{totalClicks}</Text>
        <Text style={styles.summaryLabel}>
          contactos totales generados
        </Text>
      </View>

      <Text style={styles.sectionTitle}>
        Interacciones por plato
      </Text>

      {metrics.length === 0 && (
        <Text style={styles.empty}>
          Aún no hay interacciones registradas.
        </Text>
      )}

      {metrics.map((m) => (
        <View key={m.dishId} style={styles.card}>
          <Text style={styles.cardTitle}>
            Plato ID: {m.dishId}
          </Text>
          <Text style={styles.cardMetric}>
            {m.clicks} interacciones
          </Text>
        </View>
      ))}

      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Volver</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  summaryBox: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  summaryNumber: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  summaryLabel: {
    marginTop: 6,
    fontSize: 14,
    color: "#CCCCCC",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1A1A1A",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  cardMetric: {
    marginTop: 6,
    fontSize: 13,
    color: "#777",
  },
  empty: {
    color: "#777",
    fontStyle: "italic",
    marginBottom: 20,
  },
  back: {
    marginTop: 30,
    alignItems: "center",
  },
  backText: {
    color: "#555",
    fontSize: 14,
  },
});
