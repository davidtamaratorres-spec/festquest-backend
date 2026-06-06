import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { getDemandSummary } from "./services/demand";

type Item = {
  query: string;
  city: string | null;
  count: number;
};

export default function DemandScreen() {
  const [data, setData] = useState<Item[]>([]);

  useEffect(() => {
    getDemandSummary().then(setData);
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 Demanda no satisfecha</Text>

      {data.length === 0 ? (
        <Text style={styles.empty}>
          Aún no hay búsquedas registradas.
        </Text>
      ) : (
        data.map((item, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.query}>{item.query}</Text>
            <Text style={styles.meta}>
              Ciudad: {item.city ?? "Todas"}
            </Text>
            <Text style={styles.count}>
              🔥 {item.count} búsquedas
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  empty: {
    fontSize: 14,
    color: "#666",
  },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
    marginBottom: 12,
  },
  query: {
    fontSize: 16,
    fontWeight: "600",
  },
  meta: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  count: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
  },
});

