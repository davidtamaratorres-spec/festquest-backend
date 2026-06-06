import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function DiscountScreen() {
  const { name, price } = useLocalSearchParams<{
    name?: string;
    price?: string;
  }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎁 Descuento DishQuest</Text>

      <View style={styles.card}>
        <Text style={styles.dishName}>{name}</Text>
        <Text style={styles.price}>${price}</Text>

        <View style={styles.qrBox}>
          <Text style={styles.qrText}>QR</Text>
        </View>

        <Text style={styles.info}>
          Presenta este código en el restaurante para obtener tu beneficio.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
  },
  card: {
    borderRadius: 12,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  dishName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    marginBottom: 16,
  },
  qrBox: {
    height: 160,
    borderRadius: 12,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  qrText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  info: {
    fontSize: 14,
    textAlign: "center",
    color: "#333",
  },
});
