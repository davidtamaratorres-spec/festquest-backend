import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { backendGet } from "../services/backendApi";
import { authService } from "./services/AuthService";

type Restaurante = {
  id: number;
  nombre: string;
  ciudad: string;
  direccion: string;
  whatsapp: string;
  activo: number;
};

type Plato = {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen_url: string;
  disponible: number;
};

export default function PartnerHomeScreen() {
  const router = useRouter();

  const [restaurante, setRestaurante] = useState<Restaurante | null>(null);
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        setLoading(true);

        const isLogged = await authService.isLoggedIn();
        if (!isLogged) {
          router.replace("/partner/auth");
          return;
        }

        try {
          const [rest, dishes] = await Promise.all([
            backendGet<Restaurante>("/partner/me"),
            backendGet<Plato[]>("/partner/platos"),
          ]);
          setRestaurante(rest);
          setPlatos(dishes);
        } catch (e: any) {
          if (e?.message?.includes("401") || e?.message?.includes("Token")) {
            await authService.logout();
            router.replace("/partner/auth");
          }
        } finally {
          setLoading(false);
        }
      }

      load();
    }, [router])
  );

  async function handleLogout() {
    await authService.logout();
    router.replace("/partner/auth");
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6A00" />
        <Text style={styles.loadingText}>Cargando tu restaurante...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Panel del socio</Text>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>

      {restaurante && (
        <View style={styles.card}>
          <Text style={styles.label}>Restaurante</Text>
          <Text style={styles.restaurantName}>{restaurante.nombre}</Text>
          <Text style={styles.info}>📍 {restaurante.ciudad}</Text>
          {restaurante.direccion ? (
            <Text style={styles.info}>{restaurante.direccion}</Text>
          ) : null}
          <Text style={styles.info}>📱 {restaurante.whatsapp}</Text>

          <View style={styles.actions}>
            <Pressable
              style={styles.button}
              onPress={() => router.push("/partner/add-dish")}
            >
              <Text style={styles.buttonText}>+ Agregar plato</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/partner/restaurant-form")}
            >
              <Text style={styles.secondaryText}>Editar restaurante</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/partner/menu-ia")}
            >
              <Text style={styles.secondaryText}>📷 Subir menú con IA</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/partner/analytics")}
            >
              <Text style={styles.secondaryText}>📊 Ver analíticas</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>
        Mis platos ({platos.length})
      </Text>

      {platos.length === 0 ? (
        <Text style={styles.empty}>
          Aún no tienes platos registrados. ¡Agrega el primero!
        </Text>
      ) : (
        <FlatList
          data={platos}
          keyExtractor={(p) => String(p.id)}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.platoCard}
              onPress={() => router.push(`/partner/dishes-list`)}
            >
              <View style={styles.platoRow}>
                <Text style={styles.platoNombre}>{item.nombre}</Text>
                {item.disponible === 0 && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveText}>Inactivo</Text>
                  </View>
                )}
              </View>
              <Text style={styles.platoCategoria}>{item.categoria}</Text>
              <Text style={styles.platoPrecio}>
                ${item.precio.toLocaleString("es-CO")}
              </Text>
              {item.descripcion ? (
                <Text style={styles.platoDesc} numberOfLines={2}>
                  {item.descripcion}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#666",
    fontSize: 14,
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  logoutText: {
    fontWeight: "600",
    color: "#333",
  },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111",
  },
  info: {
    color: "#555",
    marginBottom: 4,
    fontSize: 14,
  },
  actions: {
    marginTop: 14,
    gap: 8,
  },
  button: {
    backgroundColor: "#FF6A00",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: "#f2f2f2",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryText: {
    fontWeight: "600",
    color: "#333",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111",
  },
  empty: {
    color: "#888",
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
    lineHeight: 22,
  },
  platoCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
  },
  platoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  platoNombre: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    color: "#111",
  },
  platoCategoria: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  platoPrecio: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF6A00",
    marginBottom: 4,
  },
  platoDesc: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  inactiveBadge: {
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inactiveText: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
  },
});
