import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="index" options={{ title: "FiestaRuta" }} />
      <Stack.Screen name="festival/[id]" options={{ title: "Festival" }} />
      <Stack.Screen name="municipio/[id]" options={{ title: "Municipio" }} />
    </Stack>
  );
}
