import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFestival, type Festival } from '../services/festquestApi';

// ── Colores ────────────────────────────────────────────────────────────────
const C = {
  bg: '#FFF8F0',
  surface: '#FFFFFF',
  surface2: '#FFF4E6',
  orange: '#FF5500',
  orange2: '#FF7A2E',
  orangeDim: 'rgba(255,85,0,0.08)',
  orangeBorder: 'rgba(255,85,0,0.18)',
  text: '#1A1A1A',
  textSub: '#666666',
  textDim: '#AAAAAA',
  border: 'rgba(0,0,0,0.07)',
  green: '#16A34A',
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────
const present = (v: string | null | undefined): v is string => !!v?.trim();

function formatDate(iso: string | null) {
  if (!iso) return 'Sin confirmar';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function calcDuration(a: string | null, b: string | null) {
  if (!a || !b) return '—';
  const diff = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  return diff > 0 ? `${diff} días` : '1 día';
}

const openLink = (url: string | null | undefined) => { if (url) Linking.openURL(url).catch(() => {}); };

// ── Sub-componentes ────────────────────────────────────────────────────────
function SecLabel({ children }: { children: string }) {
  return (
    <View style={s.secLabelRow}>
      <View style={s.secBar} />
      <Text style={s.secLabelText}>{children}</Text>
    </View>
  );
}

function SitioItem({ nombre, sub, icon, onPress, muted }: {
  nombre: string; sub?: string; icon?: string; onPress?: () => void; muted?: boolean;
}) {
  return (
    <Pressable style={[s.sitioItem, muted && s.nullItem]} onPress={onPress}>
      <View style={s.sitioIcon}><Text style={s.sitioIconTxt}>{icon ?? '📍'}</Text></View>
      <View style={s.sitioInfo}>
        <Text style={[s.sitioName, muted && { color: C.textDim, fontStyle: 'italic' }]}>{nombre}</Text>
        {sub ? <Text style={s.sitioSub}>{sub}</Text> : null}
      </View>
      {onPress && !muted ? <Ionicons name="chevron-forward" size={13} color={C.textDim} /> : null}
    </Pressable>
  );
}

function HotelItem({ nombre, wa, muted }: { nombre: string; wa?: string | null; muted?: boolean }) {
  return (
    <Pressable style={[s.sitioItem, muted && s.nullItem]} onPress={() => openLink(wa)}>
      <View style={s.sitioIcon}><Text style={s.sitioIconTxt}>🏨</Text></View>
      <View style={s.sitioInfo}>
        <Text style={[s.sitioName, muted && { color: C.textDim, fontStyle: 'italic' }]}>{nombre}</Text>
        {wa && !muted ? <Text style={s.hotelWa}>💬 WhatsApp →</Text> : null}
        {muted ? <Text style={s.sitioSub}>Próximamente</Text> : null}
      </View>
      {wa && !muted ? <Ionicons name="chevron-forward" size={13} color={C.textDim} /> : null}
    </Pressable>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function FestivalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Festival | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getFestival(id)
      .then(f => { if (active) setData(f); })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <View style={[s.screen, s.center]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <ActivityIndicator color={C.orange} size="large" />
        <Text style={s.loadingTxt}>Cargando festival...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[s.screen, s.center]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <Text style={s.errorTxt}>{error ?? 'Festival no encontrado'}</Text>
        <Pressable style={s.errorBtn} onPress={() => router.back()}>
          <Text style={s.errorBtnTxt}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const f = data;

  const sitios = ([
    present(f.sitio_1) ? { nombre: f.sitio_1, maps: f.maps_1 } : null,
    present(f.sitio_2) ? { nombre: f.sitio_2, maps: f.maps_2 } : null,
    present(f.sitio_3) ? { nombre: f.sitio_3, maps: f.maps_3 } : null,
  ] as const).filter(Boolean) as { nombre: string; maps: string | null }[];

  const hoteles = ([
    present(f.hotel_1) ? { nombre: f.hotel_1, wa: f.wa_1 } : null,
    present(f.hotel_2) ? { nombre: f.hotel_2, wa: f.wa_2 } : null,
    present(f.hotel_3) ? { nombre: f.hotel_3, wa: f.wa_3 } : null,
  ] as const).filter(Boolean) as { nombre: string; wa: string | null }[];

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={s.hero}>
          {present(f.foto_url) ? (
            <Image source={{ uri: f.foto_url }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={['#FF8C42', '#FF5500', '#CC3300']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.80)']}
            locations={[0, 0.35, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Contenido hero */}
          <View style={s.heroContent}>
            {present(f.subregion) && (
              <View style={s.regionPill}>
                <Text style={s.regionPillTxt}>{f.subregion}</Text>
              </View>
            )}
            <Text style={s.heroTitle}>{f.nombre}</Text>
            <View style={s.heroLoc}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={s.heroLocTxt}>
                {[f.municipio, f.departamento].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Botón volver ── */}
        <Pressable style={s.volverBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
          <Text style={s.volverBtnTxt}>Volver</Text>
        </Pressable>

        {/* ── Fechas ── */}
        <View style={s.datesStrip}>
          <View style={s.dateBlock}>
            <Text style={s.dbLabel}>📅 Inicio</Text>
            <Text style={[s.dbVal, !f.fecha_inicio && s.dbValMuted]}>{formatDate(f.fecha_inicio)}</Text>
          </View>
          <View style={[s.dateBlock, s.dateBlockBorder]}>
            <Text style={s.dbLabel}>🏁 Fin</Text>
            <Text style={[s.dbVal, !f.fecha_fin && s.dbValMuted]}>{formatDate(f.fecha_fin)}</Text>
          </View>
          <View style={[s.dateBlock, s.dateBlockBorder]}>
            <Text style={s.dbLabel}>⏱ Duración</Text>
            <Text style={[s.dbVal, s.dbValMuted]}>{calcDuration(f.fecha_inicio, f.fecha_fin)}</Text>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={s.body}>

          {/* Descripción */}
          <View style={s.descCard}>
            <Text style={s.descTitle}>📖 Sobre el festival</Text>
            {present(f.descripcion)
              ? <Text style={s.descText}>{f.descripcion}</Text>
              : <Text style={s.descTextNull}>Sin descripción registrada</Text>}
          </View>

          {/* Info pills */}
          <View style={s.infoRow}>
            <View style={s.infoPill}>
              <Text style={s.ipLabel}>🌡️ Clima</Text>
              {f.temperatura_promedio != null
                ? <Text style={s.ipVal}>{f.temperatura_promedio}°<Text style={s.ipUnit}> C</Text></Text>
                : <Text style={s.ipNull}>—</Text>}
            </View>
            <View style={s.infoPill}>
              <Text style={s.ipLabel}>👥 Habitantes</Text>
              {f.habitantes != null
                ? <Text style={s.ipValSm}>{Number(f.habitantes).toLocaleString('es-CO')}</Text>
                : <Text style={s.ipNull}>—</Text>}
            </View>
            <View style={s.infoPill}>
              <Text style={s.ipLabel}>💵 Entrada</Text>
              <Text style={s.ipNull}>Libre</Text>
            </View>
          </View>

          {/* Lugar del evento */}
          {(present(f.lugar_encuentro) || present(f.maps_link)) && (
            <View style={s.secBlock}>
              <SecLabel>📍 Lugar del evento</SecLabel>
              <SitioItem
                icon="🏟️"
                nombre={present(f.lugar_encuentro) ? f.lugar_encuentro : 'Ver en mapa'}
                sub={present(f.maps_link) ? 'Ver en Google Maps →' : undefined}
                onPress={present(f.maps_link) ? () => openLink(f.maps_link) : undefined}
              />
            </View>
          )}

          {/* Sitios recomendados */}
          <View style={s.secBlock}>
            <SecLabel>🗺️ Sitios recomendados</SecLabel>
            {sitios.length > 0
              ? sitios.map((st, i) => (
                  <SitioItem key={i} nombre={st.nombre} sub={present(st.maps) ? 'Ver en Maps →' : undefined} onPress={present(st.maps) ? () => openLink(st.maps) : undefined} />
                ))
              : <SitioItem nombre="Sin registrar" sub="Próximamente" muted />}
          </View>

          {/* Hospedaje */}
          <View style={s.secBlock}>
            <SecLabel>🏨 Hospedaje</SecLabel>
            {hoteles.length > 0
              ? hoteles.map((h, i) => <HotelItem key={i} nombre={h.nombre} wa={h.wa} />)
              : <HotelItem nombre="Sin registrar" muted />}
          </View>
        </View>

        {/* ── CTA ── */}
        {f.municipio_id != null && (
          <View style={s.ctaWrap}>
            <Pressable style={s.ctaBtn} onPress={() => router.push(`/municipio/${f.municipio_id}`)}>
              <Ionicons name="business-outline" size={16} color="#fff" />
              <Text style={s.ctaBtnTxt}>Ver municipio</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  scroll: { flex: 1 },
  loadingTxt: { color: C.textSub, fontSize: 13, marginTop: 8 },
  errorTxt: { color: '#D32F2F', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  errorBtn: { backgroundColor: C.orange, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 12 },
  errorBtnTxt: { color: '#fff', fontWeight: '700' },

  hero: { height: 300, overflow: 'hidden' },
  volverBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.orange, height: 48,
    shadowColor: C.orange, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  volverBtnTxt: { fontFamily: 'Outfit_800ExtraBold', fontSize: 15, color: '#fff', letterSpacing: 0.3 },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 18, paddingBottom: 20 },
  regionPill: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8,
  },
  regionPillTxt: { fontSize: 10, color: '#fff', fontWeight: '600', letterSpacing: 0.5 },
  heroTitle: { fontFamily: 'Outfit_900Black', fontSize: 28, color: '#fff', lineHeight: 30, marginBottom: 8 },
  heroLoc: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  heroLocTxt: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  datesStrip: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  dateBlock: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, gap: 4 },
  dateBlockBorder: { borderLeftWidth: 1, borderLeftColor: C.border },
  dbLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.2, color: C.textDim, fontWeight: '600' },
  dbVal: { fontFamily: 'Outfit_700Bold', fontSize: 14, color: C.orange },
  dbValMuted: { color: C.textSub, fontFamily: undefined, fontSize: 12 },

  body: { paddingHorizontal: 16, paddingTop: 14, gap: 16 },

  descCard: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  descTitle: {
    fontFamily: 'Outfit_700Bold', fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 1.2, color: C.textDim, marginBottom: 10,
  },
  descText: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 22, color: C.text },
  descTextNull: { fontSize: 11, color: C.textDim, fontStyle: 'italic' },

  infoRow: { flexDirection: 'row', gap: 8 },
  infoPill: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 12, gap: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  ipLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.1, color: C.textDim, fontWeight: '600' },
  ipVal: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: C.orange },
  ipValSm: { fontFamily: 'Outfit_700Bold', fontSize: 12, color: C.text },
  ipUnit: { fontSize: 11, color: C.textSub, fontWeight: '400', fontFamily: undefined },
  ipNull: { fontSize: 11, color: C.textDim, fontStyle: 'italic' },

  secBlock: { gap: 8 },
  secLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  secBar: { width: 3, height: 16, backgroundColor: C.orange, borderRadius: 2 },
  secLabelText: { fontFamily: 'Outfit_800ExtraBold', fontSize: 15, color: C.text },

  sitioItem: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  sitioIcon: { width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sitioIconTxt: { fontSize: 16 },
  sitioInfo: { flex: 1 },
  sitioName: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 2 },
  sitioSub: { fontSize: 11, color: C.orange },
  hotelWa: { fontSize: 11, color: C.green },
  nullItem: { opacity: 0.35 },

  ctaWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  ctaBtn: {
    backgroundColor: C.orange, borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: C.orange, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  ctaBtnTxt: { fontFamily: 'Outfit_800ExtraBold', fontSize: 15, color: '#fff', letterSpacing: 0.3 },
});
