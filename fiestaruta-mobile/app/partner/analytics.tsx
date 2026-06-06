import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { backendGet } from "../services/backendApi";
import { authService } from "./services/AuthService";

type Summary = {
  vistas: number;
  domicilios: number;
  reservas: number;
  qr_usados: number;
};

type DayMetrics = Summary & {
  fecha: string;
};

type DishAnalytics = Summary & {
  id: number;
  nombre: string;
  tasa_conversion: number;
  tendencia_ultimos_7_dias: number;
  dias_ultimos_7: { fecha: string; vistas: number }[];
};

type AnalyticsResponse = {
  resumen: Summary;
  platos: DishAnalytics[];
  destacados: {
    plato_mas_visto: DishAnalytics | null;
    plato_mas_pedidos: DishAnalytics | null;
    plato_mejor_conversion: DishAnalytics | null;
  };
  datos_por_dia_30: DayMetrics[];
};

type StatCard = {
  label: string;
  value: number;
  color: string;
};

function shortDay(fecha: string) {
  const date = new Date(`${fecha}T00:00:00`);
  return date.toLocaleDateString("es-CO", { weekday: "short" }).replace(".", "");
}

function conversionColor(value: number) {
  if (value > 30) return "#159447";
  if (value > 10) return "#D99A00";
  return "#C83737";
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("es-CO");
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        setLoading(true);
        setError(null);

        const isLogged = await authService.isLoggedIn();
        if (!isLogged) {
          router.replace("/partner/auth");
          return;
        }

        try {
          const data = await backendGet<AnalyticsResponse>("/partner/analytics");
          setAnalytics(data);
        } catch (e: any) {
          if (e?.message?.includes("401")) {
            await authService.logout();
            router.replace("/partner/auth");
            return;
          }
          setError(e?.message ?? "Error cargando metricas");
        } finally {
          setLoading(false);
        }
      }

      load();
    }, [router])
  );

  const summaryCards: StatCard[] = analytics
    ? [
        { label: "Vistas", value: analytics.resumen.vistas, color: "#2563EB" },
        { label: "Domicilios", value: analytics.resumen.domicilios, color: "#FF6A00" },
        { label: "Reservas", value: analytics.resumen.reservas, color: "#159447" },
        { label: "QR usados", value: analytics.resumen.qr_usados, color: "#8E44AD" },
      ]
    : [];

  const last7Days = useMemo(() => {
    const days = analytics?.datos_por_dia_30.slice(-7) ?? [];
    const maxViews = Math.max(1, ...days.map((day) => day.vistas));
    return days.map((day) => ({
      ...day,
      height: Math.max(8, Math.round((day.vistas / maxViews) * 120)),
    }));
  }, [analytics]);

  const starId = analytics?.destacados.plato_mejor_conversion?.id;
  const trendId = analytics?.platos.reduce<DishAnalytics | null>((best, dish) => {
    if (!best) return dish;
    return dish.tendencia_ultimos_7_dias > best.tendencia_ultimos_7_dias ? dish : best;
  }, null)?.id;

  const hasActivity = analytics
    ? analytics.resumen.vistas + analytics.resumen.domicilios + analytics.resumen.reservas + analytics.resumen.qr_usados > 0
    : false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Analiticas</Text>
      <Text style={styles.subtitle}>Rendimiento de tus platos en DishQuest</Text>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6A00" />
          <Text style={styles.muted}>Cargando metricas...</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && analytics && (
        <>
          <View style={styles.summaryGrid}>
            {summaryCards.map((card) => (
              <View key={card.label} style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: card.color }]}>
                  {formatNumber(card.value)}
                </Text>
                <Text style={styles.summaryLabel}>{card.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.chartSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Vistas por dia</Text>
              <Text style={styles.sectionHint}>Ultimos 7 dias</Text>
            </View>
            <View style={styles.barChart}>
              {last7Days.map((day) => (
                <View key={day.fecha} style={styles.barItem}>
                  <Text style={styles.barValue}>{day.vistas}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: day.height }]} />
                  </View>
                  <Text style={styles.barLabel}>{shortDay(day.fecha)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.highlightsRow}>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>Mas visto</Text>
              <Text style={styles.highlightName} numberOfLines={2}>
                {analytics.destacados.plato_mas_visto?.nombre ?? "Sin datos"}
              </Text>
            </View>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>Mas pedidos</Text>
              <Text style={styles.highlightName} numberOfLines={2}>
                {analytics.destacados.plato_mas_pedidos?.nombre ?? "Sin datos"}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tus platos</Text>
            <Text style={styles.sectionHint}>Ranking individual</Text>
          </View>

          {analytics.platos.length === 0 ? (
            <Text style={styles.empty}>Aun no tienes platos para medir.</Text>
          ) : (
            analytics.platos.map((dish, index) => (
              <View key={dish.id} style={styles.dishCard}>
                <View style={styles.dishHeader}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <Text style={styles.dishName} numberOfLines={2}>{dish.nombre}</Text>
                </View>

                <View style={styles.badgeRow}>
                  {dish.id === starId && dish.vistas > 0 ? (
                    <View style={[styles.badge, styles.starBadge]}>
                      <Text style={styles.badgeText}>⭐ Estrella</Text>
                    </View>
                  ) : null}
                  {dish.id === trendId && dish.tendencia_ultimos_7_dias > 0 ? (
                    <View style={[styles.badge, styles.trendBadge]}>
                      <Text style={styles.badgeText}>🔥 Tendencia</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.metricsRow}>
                  <Metric label="Vistas" value={dish.vistas} />
                  <Metric label="Domicilios" value={dish.domicilios} />
                  <Metric label="Reservas" value={dish.reservas} />
                  <Metric label="QR usados" value={dish.qr_usados} />
                </View>

                <View style={styles.conversionRow}>
                  <Text style={styles.conversionLabel}>Conversion domicilio/vista</Text>
                  <Text style={[styles.conversionValue, { color: conversionColor(dish.tasa_conversion) }]}>
                    {dish.tasa_conversion}%
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, dish.tasa_conversion)}%`,
                        backgroundColor: conversionColor(dish.tasa_conversion),
                      },
                    ]}
                  />
                </View>

                <Text style={styles.weekTrend}>
                  {dish.tendencia_ultimos_7_dias} vistas en los ultimos 7 dias
                </Text>
              </View>
            ))
          )}

          {!hasActivity ? (
            <Text style={styles.empty}>
              Aun no hay actividad registrada. Las metricas apareceran cuando los usuarios vean tus platos o interactuen con ellos.
            </Text>
          ) : null}
        </>
      )}

      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>Volver al panel</Text>
      </Pressable>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricValue}>{formatNumber(value)}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 18 },
  center: { alignItems: "center", gap: 10, marginVertical: 30 },
  muted: { color: "#666" },
  errorText: { color: "#C83737", fontWeight: "700", textAlign: "center" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  summaryCard: {
    width: "48%",
    minHeight: 92,
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 14,
    justifyContent: "center",
  },
  summaryValue: { fontSize: 28, fontWeight: "900" },
  summaryLabel: { fontSize: 13, color: "#555", fontWeight: "700", marginTop: 4 },
  chartSection: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
    backgroundColor: "#fafafa",
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: "#111" },
  sectionHint: { fontSize: 12, fontWeight: "700", color: "#888" },
  barChart: { height: 176, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 },
  barItem: { flex: 1, alignItems: "center", gap: 5 },
  barValue: { fontSize: 11, color: "#555", fontWeight: "700" },
  barTrack: { height: 124, width: "100%", justifyContent: "flex-end", alignItems: "center" },
  barFill: { width: "70%", borderRadius: 6, backgroundColor: "#FF6A00" },
  barLabel: { fontSize: 11, color: "#777", fontWeight: "700", textTransform: "capitalize" },
  highlightsRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  highlightCard: {
    flex: 1,
    minHeight: 84,
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#111",
    justifyContent: "center",
  },
  highlightLabel: { fontSize: 12, color: "#ccc", fontWeight: "700", marginBottom: 4 },
  highlightName: { fontSize: 15, color: "#fff", fontWeight: "900" },
  dishCard: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  dishHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  rankBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },
  rankText: { color: "#111", fontWeight: "900" },
  dishName: { flex: 1, fontSize: 16, fontWeight: "900", color: "#111" },
  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  starBadge: { backgroundColor: "#159447" },
  trendBadge: { backgroundColor: "#FF6A00" },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  metricBox: { width: "48%", backgroundColor: "#fafafa", borderRadius: 8, padding: 10 },
  metricValue: { fontSize: 18, fontWeight: "900", color: "#111" },
  metricLabel: { fontSize: 11, color: "#777", fontWeight: "700", marginTop: 2 },
  conversionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  conversionLabel: { fontSize: 12, color: "#666", fontWeight: "700" },
  conversionValue: { fontSize: 18, fontWeight: "900" },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: "#eee", overflow: "hidden", marginTop: 8 },
  progressFill: { height: 8, borderRadius: 4 },
  weekTrend: { fontSize: 12, color: "#777", marginTop: 10, fontWeight: "700" },
  empty: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 20, marginVertical: 16 },
  backBtn: { backgroundColor: "#eee", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 8 },
  backBtnText: { fontWeight: "800", color: "#333" },
});
