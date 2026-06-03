import { View, Text, StyleSheet } from "react-native";

export default function ComingSoon() {
  return (
    <View style={styles.page}>
      <Text style={styles.h1}>Próximo</Text>
      <Text style={styles.p}>
        Aquí vamos a conectar comida, lugares y el link con DishQuest.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0b0b0b",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  h1: { color: "white", fontSize: 22, fontWeight: "900" },
  p: { color: "#bdbdbd", marginTop: 10, textAlign: "center", fontWeight: "700" },
});
