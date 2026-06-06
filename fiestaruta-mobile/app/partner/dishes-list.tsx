import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { backendDelete, backendGet } from "../services/backendApi";
import { authService } from "./services/AuthService";

type Plato = {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen_url: string;
  disponible: number;
  tiene_descuento?: number;
  porcentaje_descuento?: number;
  acepta_domicilio?: number;
  acepta_reserva?: number;
};

type QrData = {
  token: string;
  porcentaje_descuento: number;
  fecha_expiracion: string;
  qr_image_url: string;
};

export default function DishesListScreen() {
  const router = useRouter();

  const [platos, setPlatos] = useState<Plato[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrLoadingId, setQrLoadingId] = useState<number | null>(null);
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [qrDishName, setQrDishName] = useState("");

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
          const data = await backendGet<Plato[]>("/partner/platos");
          setPlatos(data);
        } catch (e: any) {
          if (e?.message?.includes("401")) {
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

  function confirmDelete(plato: Plato) {
    Alert.alert(
      "Eliminar plato",
      `¿Eliminar "${plato.nombre}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await backendDelete(`/partner/platos/${plato.id}`);
              setPlatos((prev) => prev.filter((p) => p.id !== plato.id));
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "No se pudo eliminar el plato.");
            }
          },
        },
      ]
    );
  }

  async function showQr(plato: Plato) {
    setQrLoadingId(plato.id);
    try {
      const data = await backendGet<QrData>(`/partner/platos/${plato.id}/qr`);
      setQrDishName(plato.nombre);
      setQrData(data);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo generar el QR.");
    } finally {
      setQrLoadingId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6A00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis platos ({platos.length})</Text>

      {platos.length === 0 ? (
        <Text style={styles.empty}>Aún no tienes platos registrados.</Text>
      ) : (
        <FlatList
          data={platos}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.nombre}</Text>
                  {item.disponible === 0 && (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveText}>Inactivo</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.categoria}>{item.categoria}</Text>
                <Text style={styles.price}>
                  ${item.precio.toLocaleString("es-CO")}
                </Text>
                {item.descripcion ? (
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.descripcion}
                  </Text>
                ) : null}
              </View>

              <View style={styles.itemActions}>
                <Pressable
                  style={styles.qrBtn}
                  onPress={() => showQr(item)}
                  disabled={qrLoadingId === item.id}
                >
                  <Text style={styles.qrText}>
                    {qrLoadingId === item.id ? "..." : "🎟️ QR"}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.editBtn}
                  onPress={() => router.push({
                    pathname: "/partner/edit-dish",
                    params: {
                      id: String(item.id),
                      nombre: item.nombre,
                      descripcion: item.descripcion ?? "",
                      precio: String(item.precio),
                      categoria: item.categoria ?? "",
                      imagen_url: item.imagen_url ?? "",
                      disponible: String(item.disponible),
                      tiene_descuento: String(item.tiene_descuento ?? 0),
                      porcentaje_descuento: String(item.porcentaje_descuento ?? 0),
                      acepta_domicilio: String(item.acepta_domicilio ?? 0),
                      acepta_reserva: String(item.acepta_reserva ?? 0),
                    },
                  })}
                >
                  <Text style={styles.editText}>Editar</Text>
                </Pressable>
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => confirmDelete(item)}
                >
                  <Text style={styles.deleteText}>Eliminar</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Pressable
        style={styles.button}
        onPress={() => router.push("/partner/add-dish")}
      >
        <Text style={styles.buttonText}>+ Agregar plato</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryText}>Volver al panel</Text>
      </Pressable>

      <Modal visible={!!qrData} transparent animationType="fade" onRequestClose={() => setQrData(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>QR de descuento</Text>
            <Text style={styles.modalSubtitle}>{qrDishName}</Text>
            {qrData ? (
              <>
                <Image source={{ uri: qrData.qr_image_url }} style={styles.qrImage} />
                <Text style={styles.modalInfo}>
                  {qrData.porcentaje_descuento}% de descuento · vence{" "}
                  {new Date(qrData.fecha_expiracion).toLocaleString("es-CO")}
                </Text>
                <Text style={styles.tokenText}>{qrData.token}</Text>
              </>
            ) : null}
            <Pressable style={styles.modalButton} onPress={() => setQrData(null)}>
              <Text style={styles.modalButtonText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, padding: 24 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  empty: { color: "#888", marginBottom: 20, fontSize: 14 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#fafafa",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  cardBody: { flex: 1 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  name: { fontWeight: "700", fontSize: 15, flex: 1, color: "#111" },
  categoria: { fontSize: 12, color: "#888", marginBottom: 2 },
  price: { fontSize: 14, fontWeight: "700", color: "#FF6A00", marginBottom: 4 },
  desc: { fontSize: 12, color: "#666", lineHeight: 17 },
  inactiveBadge: {
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  inactiveText: { fontSize: 11, color: "#999", fontWeight: "600" },
  itemActions: { gap: 8, alignItems: "flex-end" },
  qrBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FF6A00",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  qrText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  editBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  editText: { color: "#333", fontWeight: "600", fontSize: 13 },
  deleteBtn: { minHeight: 36, paddingHorizontal: 12, paddingVertical: 6, alignItems: "center", justifyContent: "center" },
  deleteText: { color: "#c00", fontWeight: "600", fontSize: 13 },
  button: {
    backgroundColor: "#FF6A00",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: {
    backgroundColor: "#eee",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryText: { fontWeight: "600", color: "#333" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  modalSubtitle: { fontSize: 14, color: "#666", marginTop: 4, marginBottom: 14, textAlign: "center" },
  qrImage: { width: 260, height: 260, backgroundColor: "#f5f5f5", marginBottom: 12 },
  modalInfo: { fontSize: 13, color: "#444", textAlign: "center", marginBottom: 8 },
  tokenText: { fontSize: 10, color: "#999", textAlign: "center", marginBottom: 14 },
  modalButton: { backgroundColor: "#111", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10 },
  modalButtonText: { color: "#fff", fontWeight: "700" },
});
