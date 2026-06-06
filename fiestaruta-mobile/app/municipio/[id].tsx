import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { getMunicipio, type Municipio, type MunicipioResponse } from '../services/festquestApi';

// ── Colores ────────────────────────────────────────────────────────────────
const C = {
  bg: '#0c0c0c',
  surface: '#181818',
  surface2: '#202020',
  surface3: '#262626',
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
  if (!iso) return 'Sin fecha';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

const openLink = (url: string) => Linking.openURL(url).catch(() => {});

// ── Sub-componentes ────────────────────────────────────────────────────────
function SecLabel({ children }: { children: string }) {
  return (
    <View style={s.secLabelRow}>
      <View style={s.secBar} />
      <Text style={s.secLabelText}>{children}</Text>
    </View>
  );
}

function FlagDisplay({ url, nombre }: { url: string | null; nombre: string }) {
  const [imgError, setImgError] = useState(false);

  const resolvedUrl = present(url)
    ? (url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `https://festquest-backend.onrender.com${url.startsWith('/') ? '' : '/'}${url}`)
    : null;

  if (resolvedUrl && !imgError) {
    return (
      <Image
        source={{ uri: resolvedUrl }}
        style={s.bandera}
        resizeMode="cover"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <View style={[s.bandera, s.banderaPlaceholder]}>
      <Text style={s.banderaIni}>{nombre.slice(0, 2).toUpperCase()}</Text>
    </View>
  );
}

function StatItem({ label, value, unit, accent }: {
  label: string; value: string; unit?: string; accent?: boolean;
}) {
  return (
    <View style={s.statItem}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statVal, accent && s.statValAccent]}>
        {value}
        {unit ? <Text style={s.statUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

function SitioItem({ nombre, maps, muted }: { nombre: string; maps?: string | null; muted?: boolean }) {
  return (
    <Pressable style={[s.sitioItem, muted && s.nullItem]} onPress={maps ? () => openLink(maps) : undefined}>
      <View style={s.sitioIcon}><Text style={s.sitioIconTxt}>📍</Text></View>
      <View style={s.sitioInfo}>
        <Text style={[s.sitioName, muted && { color: C.textDim, fontStyle: 'italic' }]}>{nombre}</Text>
        {maps && !muted ? <Text style={s.sitioSub}>Ver en Maps →</Text> : null}
        {muted ? <Text style={s.sitioSub}>Pendiente de carga</Text> : null}
      </View>
      {maps && !muted ? <Ionicons name="chevron-forward" size={13} color={C.textDim} /> : null}
    </Pressable>
  );
}

function HotelItem({ nombre, wa, muted }: { nombre: string; wa?: string | null; muted?: boolean }) {
  return (
    <Pressable style={[s.sitioItem, muted && s.nullItem]} onPress={wa ? () => openLink(wa) : undefined}>
      <View style={s.sitioIcon}><Text style={s.sitioIconTxt}>🏨</Text></View>
      <View style={s.sitioInfo}>
        <Text style={[s.sitioName, muted && { color: C.textDim, fontStyle: 'italic' }]}>{nombre}</Text>
        {wa && !muted ? <Text style={s.hotelWa}>💬 WhatsApp →</Text> : null}
        {muted ? <Text style={s.sitioSub}>Pendiente</Text> : null}
      </View>
      {wa && !muted ? <Ionicons name="chevron-forward" size={13} color={C.textDim} /> : null}
    </Pressable>
  );
}

function MapPlaceholder({ nombre, departamento }: { nombre: string; departamento: string | null }) {
  const dept = departamento ?? '';
  const query = encodeURIComponent(`${nombre}${dept ? `, ${dept}` : ''}, Colombia`);
  return (
    <Pressable
      style={s.mapWrap}
      onPress={() => openLink(`https://www.google.com/maps/search/${query}`)}
    >
      <View style={s.mapBg} />
      <Text style={s.mapLabel}>{nombre}{dept ? `, ${dept}` : ''}</Text>
      <View style={s.mapPin}>
        <View style={s.pinCircle} />
        <View style={s.pinLine} />
      </View>
      <View style={s.mapInfoBox}>
        <Text style={s.mapInfoTxt}>Ver en Maps →</Text>
      </View>
    </Pressable>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function MunicipioDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<MunicipioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMunicipio(id)
      .then(d => { if (active) setData(d); })
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
        <Text style={s.loadingTxt}>Cargando municipio...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[s.screen, s.center]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <Text style={s.errorTxt}>{error ?? 'Municipio no encontrado'}</Text>
        <Pressable style={s.errorBtn} onPress={() => router.back()}>
          <Text style={s.errorBtnTxt}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const { municipio: m, festivals = [] } = data;

  const sitios = ([
    present(m.sitio_1) ? { nombre: m.sitio_1, maps: m.maps_1 } : null,
    present(m.sitio_2) ? { nombre: m.sitio_2, maps: m.maps_2 } : null,
    present(m.sitio_3) ? { nombre: m.sitio_3, maps: m.maps_3 } : null,
  ] as const).filter(Boolean) as { nombre: string; maps: string | null }[];

  const hoteles = ([
    present(m.hotel_1) ? { nombre: m.hotel_1, wa: m.wa_1 } : null,
    present(m.hotel_2) ? { nombre: m.hotel_2, wa: m.wa_2 } : null,
    present(m.hotel_3) ? { nombre: m.hotel_3, wa: m.wa_3 } : null,
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
        <Text style={s.tbTitle}>Municipio</Text>
        <Pressable
          style={s.tbBtn}
          onPress={() => Share.share({ title: m.nombre, message: `${m.nombre} — FestQuest` })}
        >
          <Ionicons name="share-social-outline" size={16} color={C.text} />
        </Pressable>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Muni Hero ── */}
        <View style={s.muniHero}>
          {/* Top row: bandera + título */}
          <View style={s.muniTop}>
            <FlagDisplay url={m.bandera_url} nombre={m.nombre} />
            <View style={{ flex: 1 }}>
              <Text style={s.muniName}>{m.nombre}</Text>
              <View style={s.muniDpto}>
                <Ionicons name="location-outline" size={11} color={C.orange} />
                <Text style={s.muniDptoTxt}>
                  {m.departamento}{present(m.subregion) ? ` · ${m.subregion}` : ''}
                </Text>
              </View>
              {present(m.gentilicio) && (
                <View style={s.gentilicioBadge}>
                  <Text style={s.gentilicioTxt}>{m.gentilicio}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Alcalde card */}
          <View style={s.alcaldeCard}>
            <View style={s.alcaldeAvatar}>
              <Text style={{ fontSize: 17 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.alcaldeRol}>Alcalde / Alcaldesa</Text>
              <Text style={s.alcaldeName}>
                {present(m.alcalde) ? m.alcalde : 'Pendiente de registro'}
              </Text>
              {present(m.correo_alcalde) ? (
                <Text style={s.alcaldeEmail}>{m.correo_alcalde}</Text>
              ) : (
                <Text style={s.alcaldeEmailNull}>correo no registrado</Text>
              )}
            </View>
            {present(m.correo_alcalde) && (
              <Pressable
                style={s.alcaldeBtn}
                onPress={() => openLink(`mailto:${m.correo_alcalde}`)}
              >
                <Ionicons name="mail-outline" size={13} color={C.orange} />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Body ── */}
        <View style={s.body}>

          {/* Código DANE */}
          <View style={s.daneBadge}>
            <Ionicons name="grid-outline" size={14} color={C.textDim} />
            <Text style={s.daneTxt}>
              Código DANE: <Text style={s.daneVal}>{m.codigo_dane ?? '—'}</Text>
            </Text>
          </View>

          {/* Stats */}
          <View style={s.statsGrid}>
            <StatItem
              label="👥 Habitantes"
              value={m.habitantes != null ? Number(m.habitantes).toLocaleString('es-CO') : '—'}
            />
            <StatItem
              label="🌡️ Temperatura"
              value={m.temperatura_promedio != null ? `${m.temperatura_promedio}` : '—'}
              unit={m.temperatura_promedio != null ? '°C prom.' : undefined}
            />
            <StatItem
              label="⛰️ Altura"
              value={m.altura != null ? `${m.altura}` : '—'}
              unit={m.altura != null ? 'msnm' : undefined}
            />
            <StatItem label="📐 Área" value="—" accent />
          </View>

          {/* Mapa */}
          <View style={s.secBlock}>
            <SecLabel>📍 Geolocalización</SecLabel>
            <MapPlaceholder nombre={m.nombre} departamento={m.departamento} />
          </View>

          {/* Festivales del municipio */}
          {festivals.length > 0 && (
            <View style={s.secBlock}>
              <SecLabel>🎊 Festivales</SecLabel>
              {festivals.map(f => (
                <Pressable
                  key={f.id}
                  style={s.festMini}
                  onPress={() => router.push(`/festival/${f.id}`)}
                >
                  <View style={s.festMiniDot} />
                  <Text style={s.festMiniName} numberOfLines={1}>{f.nombre}</Text>
                  <Text style={s.festMiniDate}>
                    {f.fecha_inicio ? formatDate(f.fecha_inicio) : 'Sin fecha'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Sitios turísticos */}
          <View style={s.secBlock}>
            <SecLabel>🗺️ Sitios turísticos</SecLabel>
            {sitios.length > 0
              ? sitios.map((st, i) => (
                  <SitioItem key={i} nombre={st.nombre} maps={st.maps} />
                ))
              : <SitioItem nombre="Sin registrar" muted />}
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

          <View style={{ height: 16 }} />
        </View>
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

  // Muni hero
  muniHero: {
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
    padding: 18, gap: 14,
  },
  muniTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  bandera: { width: 54, height: 38, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  banderaPlaceholder: { backgroundColor: C.orangeDim, alignItems: 'center', justifyContent: 'center' },
  banderaIni: { fontSize: 13, fontWeight: '800', color: C.orange, fontFamily: 'Outfit_800ExtraBold' },
  muniName: {
    fontFamily: 'Outfit_900Black',
    fontSize: 22, fontWeight: '900', color: C.text, lineHeight: 24, marginBottom: 4,
  },
  muniDpto: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  muniDptoTxt: { fontSize: 12, color: C.textSub },
  gentilicioBadge: {
    alignSelf: 'flex-start', marginTop: 5,
    backgroundColor: C.orangeDim, borderWidth: 1, borderColor: C.orangeBorder,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2,
  },
  gentilicioTxt: {
    fontSize: 10, fontWeight: '600', color: C.orange2, letterSpacing: 0.9,
  },

  // Alcalde
  alcaldeCard: {
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  alcaldeAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.orangeDim, borderWidth: 1, borderColor: C.orangeBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  alcaldeRol: {
    fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.2,
    color: C.textDim, fontWeight: '600', marginBottom: 2,
  },
  alcaldeName: { fontFamily: 'Outfit_700Bold', fontWeight: '700', fontSize: 13, color: C.text },
  alcaldeEmail: { fontSize: 10, color: C.orange, marginTop: 2 },
  alcaldeEmailNull: { fontSize: 10, color: C.textDim, fontStyle: 'italic', marginTop: 2 },
  alcaldeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.orangeDim, borderWidth: 1, borderColor: C.orangeBorder,
    alignItems: 'center', justifyContent: 'center',
  },

  // Body
  body: { paddingHorizontal: 16, paddingTop: 14, gap: 14 },

  // DANE
  daneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 8, paddingHorizontal: 12,
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: 10,
  },
  daneTxt: { fontSize: 11, color: C.textDim },
  daneVal: { color: C.textSub, fontFamily: 'Outfit_700Bold', fontWeight: '700', fontSize: 13 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statItem: {
    width: '48%', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 12, gap: 4,
  },
  statLabel: {
    fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.1,
    color: C.textDim, fontWeight: '600',
  },
  statVal: { fontFamily: 'Outfit_800ExtraBold', fontWeight: '800', fontSize: 20, color: C.text },
  statValAccent: { color: C.orange, fontSize: 16 },
  statUnit: { fontSize: 9, color: C.textSub, fontWeight: '400', fontFamily: undefined },

  // Map
  secBlock: { gap: 8 },
  secLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  secBar: { width: 3, height: 15, backgroundColor: C.orange, borderRadius: 2 },
  secLabelText: { fontFamily: 'Outfit_800ExtraBold', fontSize: 14, fontWeight: '800', color: C.text },

  mapWrap: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, height: 140, overflow: 'hidden',
  },
  mapBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#111' },
  mapLabel: {
    position: 'absolute', top: 10, alignSelf: 'center',
    fontSize: 9, fontWeight: '600', letterSpacing: 0.9,
    textTransform: 'uppercase', color: C.textDim,
  },
  mapPin: { position: 'absolute', top: '40%', left: '45%', alignItems: 'center' },
  pinCircle: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: C.orange, borderWidth: 3,
    borderColor: 'rgba(255,107,26,0.3)',
    shadowColor: C.orange, shadowOpacity: 0.4, shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  pinLine: { width: 2, height: 12, backgroundColor: C.orange },
  mapInfoBox: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)', borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5,
  },
  mapInfoTxt: { fontSize: 10, color: C.textSub },

  // Festivales mini
  festMini: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 10, paddingHorizontal: 13,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  festMiniDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.orange },
  festMiniName: {
    fontFamily: 'Outfit_700Bold',
    flex: 1, fontSize: 12, fontWeight: '600', color: C.text,
  },
  festMiniDate: { fontSize: 10, color: C.textDim },

  // Sitio / hotel
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
});
