import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFestival, type Festival } from '../services/festquestApi';

// ── Colores ────────────────────────────────────────────────────────────────
const C = {
  bg: '#0c0c0c',
  surface: '#181818',
  surface2: '#202020',
  orange: '#FF5E00',
  orange2: '#FF7533',
  orangeDim: 'rgba(255,94,0,0.12)',
  orangeBorder: 'rgba(255,94,0,0.25)',
  text: '#FFFFFF',
  textSub: '#888888',
  textDim: '#555555',
  border: 'rgba(255,255,255,0.07)',
  green: '#2ECC71',
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────
const present = (v: string | null | undefined): v is string => !!v?.trim();

function formatDate(iso: string | null): string {
  if (!iso) return 'Sin confirmar';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function calcDuration(a: string | null, b: string | null): string {
  if (!a || !b) return '— días';
  const diff = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  return diff > 0 ? `${diff} días` : '— días';
}

const openLink = (url: string | null | undefined) => {
  if (url) Linking.openURL(url).catch(() => {});
};

// ── Sub-componentes ────────────────────────────────────────────────────────
function SecLabel({ children }: { children: string }) {
  return (
    <View style={s.secLabelRow}>
      <View style={s.secBar} />
      <Text style={s.secLabelText}>{children}</Text>
    </View>
  );
}

function SitioItem({
  nombre, sub, icon, onPress, muted,
}: { nombre: string; sub?: string; icon?: string; onPress?: () => void; muted?: boolean }) {
  return (
    <Pressable style={[s.sitioItem, muted && s.nullItem]} onPress={onPress}>
      <View style={s.sitioIcon}>
        <Text style={s.sitioIconTxt}>{icon ?? '📍'}</Text>
      </View>
      <View style={s.sitioInfo}>
        <Text style={[s.sitioName, muted && { color: C.textDim, fontStyle: 'italic' }]}>{nombre}</Text>
        {sub ? <Text style={s.sitioSub}>{sub}</Text> : null}
      </View>
      {onPress && !muted ? <Ionicons name="chevron-forward" size={13} color={C.textDim} /> : null}
    </Pressable>
  );
}

function HotelItem({
  nombre, wa, muted,
}: { nombre: string; wa?: string | null; muted?: boolean }) {
  return (
    <Pressable style={[s.sitioItem, muted && s.nullItem]} onPress={() => openLink(wa)}>
      <View style={s.sitioIcon}>
        <Text style={s.sitioIconTxt}>🏨</Text>
      </View>
      <View style={s.sitioInfo}>
        <Text style={[s.sitioName, muted && { color: C.textDim, fontStyle: 'italic' }]}>{nombre}</Text>
        {wa && !muted ? <Text style={s.hotelWa}>💬 WhatsApp →</Text> : null}
        {muted ? <Text style={s.sitioSub}>Próximamente</Text> : null}
      </View>
      {wa && !muted ? <Ionicons name="chevron-forward" size={13} color={C.textDim} /> : null}
    </Pressable>
  );
}

function PendingSection({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <View style={s.pendingSection}>
      <View style={s.pendingIcon}>
        <Text style={s.sitioIconTxt}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.pendingTitle}>{title}</Text>
        <Text style={s.pendingSub}>{sub}</Text>
      </View>
    </View>
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
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ActivityIndicator color={C.orange} size="large" />
        <Text style={s.loadingTxt}>Cargando festival...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[s.screen, s.center]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
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
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Topbar ── */}
      <View style={s.topbar}>
        <Pressable style={s.tbBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={C.text} />
        </Pressable>
        <Text style={s.tbTitle}>Festival</Text>
        <Pressable
          style={s.tbBtn}
          onPress={() => Share.share({ title: f.nombre, message: `${f.nombre} — FestQuest` })}
        >
          <Ionicons name="share-social-outline" size={16} color={C.text} />
        </Pressable>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={s.hero}>
          <View style={s.heroBg} />
          <View style={s.heroGlow} />
          <View style={s.heroContent}>
            <View style={s.badgePill}>
              <View style={s.badgeDot} />
              <Text style={s.badgePillTxt}>Festival Regional</Text>
            </View>
            <Text style={s.heroTitle}>{f.nombre}</Text>
            <View style={s.heroLoc}>
              <Ionicons name="location-outline" size={11} color={C.orange} />
              {present(f.municipio) && <Text style={s.heroLocTxt}>{f.municipio}</Text>}
              {present(f.departamento) && (
                <><View style={s.locSep} /><Text style={s.heroLocTxt}>{f.departamento}</Text></>
              )}
              {present(f.subregion) && (
                <><View style={s.locSep} /><Text style={s.heroLocTxt}>{f.subregion}</Text></>
              )}
            </View>
          </View>
        </View>

        {/* ── Fechas ── */}
        <View style={s.datesStrip}>
          <View style={s.dateBlock}>
            <Text style={s.dbLabel}>📅 Inicio</Text>
            <Text style={[s.dbVal, !f.fecha_inicio && s.dbValMuted]}>
              {formatDate(f.fecha_inicio)}
            </Text>
          </View>
          <View style={[s.dateBlock, s.dateBlockBorder]}>
            <Text style={s.dbLabel}>🏁 Fin</Text>
            <Text style={[s.dbVal, !f.fecha_fin && s.dbValMuted]}>
              {formatDate(f.fecha_fin)}
            </Text>
          </View>
          <View style={[s.dateBlock, s.dateBlockBorder]}>
            <Text style={s.dbLabel}>⏱ Duración</Text>
            <Text style={[s.dbVal, s.dbValMuted]}>
              {calcDuration(f.fecha_inicio, f.fecha_fin)}
            </Text>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={s.body}>

          {/* Descripción */}
          <View style={s.descCard}>
            <Text style={s.descTitle}>📖 Sobre el festival</Text>
            {present(f.descripcion) ? (
              <Text style={s.descText}>{f.descripcion}</Text>
            ) : (
              <Text style={s.descTextNull}>Sin descripción registrada</Text>
            )}
          </View>

          {/* Info rápida */}
          <View style={s.infoRow}>
            <View style={s.infoPill}>
              <Text style={s.ipLabel}>🌡️ Clima</Text>
              {f.temperatura_promedio != null
                ? <Text style={s.ipVal}>{f.temperatura_promedio}°<Text style={s.ipUnit}> C</Text></Text>
                : <Text style={s.ipNull}>—</Text>}
            </View>
            <View style={s.infoPill}>
              <Text style={s.ipLabel}>👥 Municipio</Text>
              {f.habitantes != null
                ? <Text style={s.ipValSm}>{Number(f.habitantes).toLocaleString('es-CO')} hab.</Text>
                : <Text style={s.ipNull}>—</Text>}
            </View>
            <View style={s.infoPill}>
              <Text style={s.ipLabel}>💵 Entrada</Text>
              <Text style={s.ipNull}>Pendiente</Text>
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
                  <SitioItem
                    key={i}
                    nombre={st.nombre}
                    sub={present(st.maps) ? 'Ver en Maps →' : undefined}
                    onPress={present(st.maps) ? () => openLink(st.maps) : undefined}
                  />
                ))
              : <SitioItem nombre="Sin registrar" sub="Próximamente" muted />}
          </View>

          {/* Hospedaje */}
          <View style={s.secBlock}>
            <SecLabel>🏨 Hospedaje</SecLabel>
            {hoteles.length > 0
              ? hoteles.map((h, i) => (
                  <HotelItem key={i} nombre={h.nombre} wa={h.wa} />
                ))
              : <HotelItem nombre="Sin registrar" muted />}
          </View>

          {/* Campos pendientes */}
          <PendingSection
            icon="🎤"
            title="Artistas confirmados"
            sub="Disponible cuando se confirmen fechas"
          />
          <PendingSection
            icon="🖼️"
            title="Galería de fotos"
            sub="Pendiente de carga"
          />
          <PendingSection
            icon="📞"
            title="Contacto organizador"
            sub="Pendiente de registro"
          />

        </View>

        {/* ── CTA ── */}
        {f.municipio_id != null && (
          <View style={s.ctaWrap}>
            <Pressable
              style={s.ctaBtn}
              onPress={() => router.push(`/municipio/${f.municipio_id}`)}
            >
              <Text style={s.ctaBtnTxt}>🏛️  Ver municipio completo</Text>
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
  center: { justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  scroll: { flex: 1 },
  loadingTxt: { color: C.textSub, fontSize: 13, marginTop: 8 },
  errorTxt: { color: '#ff4444', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  errorBtn: { backgroundColor: C.orange, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 12 },
  errorBtnTxt: { color: '#fff', fontWeight: '700' },

  // Topbar
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10,
    backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  tbBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
  },
  tbTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14, fontWeight: '700', color: C.textSub,
    textTransform: 'uppercase', letterSpacing: 0.9,
  },

  // Hero
  hero: { height: 200, overflow: 'hidden' },
  heroBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1e0900' },
  heroGlow: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,107,26,0.18)', left: -40, top: 30,
  },
  heroContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 18, paddingBottom: 16,
  },
  badgePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,107,26,0.15)', borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.3)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.orange },
  badgePillTxt: {
    fontSize: 10, fontWeight: '700', color: C.orange2,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: 'Outfit_900Black',
    fontSize: 26, fontWeight: '900', color: C.text, lineHeight: 28, marginBottom: 7,
  },
  heroLoc: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  heroLocTxt: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  locSep: { width: 2, height: 2, borderRadius: 1, backgroundColor: '#555' },

  // Dates strip
  datesStrip: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border,
  },
  dateBlock: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 3 },
  dateBlockBorder: { borderLeftWidth: 1, borderLeftColor: C.border },
  dbLabel: {
    fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.2,
    color: C.textDim, fontWeight: '600',
  },
  dbVal: {
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700', fontSize: 15, color: C.orange,
  },
  dbValMuted: { color: C.textSub, fontFamily: undefined, fontSize: 13 },

  // Body
  body: { paddingHorizontal: 16, paddingTop: 14, gap: 16 },

  // Descripción
  descCard: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14,
  },
  descTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1.2, color: C.textDim, marginBottom: 8,
  },
  descText: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 21, color: C.textSub },
  descTextNull: { fontSize: 11, color: C.textDim, fontStyle: 'italic' },

  // Info row
  infoRow: { flexDirection: 'row', gap: 8 },
  infoPill: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 11, gap: 4,
  },
  ipLabel: {
    fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.1,
    color: C.textDim, fontWeight: '600',
  },
  ipVal: { fontFamily: 'Outfit_700Bold', fontWeight: '700', fontSize: 15, color: C.text },
  ipValSm: { fontFamily: 'Outfit_700Bold', fontWeight: '700', fontSize: 12, color: C.text },
  ipUnit: { fontSize: 11, color: C.textSub, fontWeight: '400', fontFamily: undefined },
  ipNull: { fontSize: 11, color: C.textDim, fontStyle: 'italic' },

  // Section label
  secBlock: { gap: 8 },
  secLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  secBar: { width: 3, height: 15, backgroundColor: C.orange, borderRadius: 2 },
  secLabelText: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 14, fontWeight: '800', color: C.text,
  },

  // Sitio / hotel items
  sitioItem: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  sitioIcon: {
    width: 34, height: 34, backgroundColor: C.surface2, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  sitioIconTxt: { fontSize: 16 },
  sitioInfo: { flex: 1 },
  sitioName: { fontSize: 12, fontWeight: '600', color: C.text, marginBottom: 2 },
  sitioSub: { fontSize: 10, color: C.textDim },
  hotelWa: { fontSize: 10, color: C.green },
  nullItem: { opacity: 0.35 },

  // Pending
  pendingSection: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: 'rgba(255,107,26,0.2)',
    borderStyle: 'dashed', borderRadius: 14,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  pendingIcon: {
    width: 32, height: 32, backgroundColor: 'rgba(255,107,26,0.08)',
    borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  pendingTitle: { fontSize: 11, fontWeight: '600', color: C.textSub, marginBottom: 2 },
  pendingSub: { fontSize: 10, color: C.textDim },

  // CTA
  ctaWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },
  ctaBtn: {
    backgroundColor: C.orange, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.orange, shadowOpacity: 0.3, shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  ctaBtnTxt: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.3,
  },
});
