import { Image } from 'expo-image';
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
import { getMunicipio, type MunicipioResponse } from '../services/festquestApi';

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
const openLink = (url: string) => Linking.openURL(url).catch(() => {});

function formatDate(iso: string | null) {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Sub-componentes ────────────────────────────────────────────────────────
function SecLabel({ children }: { children: string }) {
  return (
    <View style={s.secLabelRow}>
      <View style={s.secBar} />
      <Text style={s.secLabelText}>{children}</Text>
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
        {value}{unit ? <Text style={s.statUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

function SitioItemWithPhoto({ nombre, maps, foto, muted }: {
  nombre: string; maps?: string | null; foto?: string | null; muted?: boolean;
}) {
  return (
    <Pressable style={[s.sitioItem, muted && s.nullItem]} onPress={maps && !muted ? () => openLink(maps) : undefined}>
      {foto && !muted ? (
        <Image source={{ uri: foto }} style={s.sitioFoto} contentFit="cover" />
      ) : (
        <View style={s.sitioIcon}><Text style={s.sitioIconTxt}>📍</Text></View>
      )}
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
    <Pressable style={[s.sitioItem, muted && s.nullItem]} onPress={wa && !muted ? () => openLink(wa) : undefined}>
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

// ── Screen ─────────────────────────────────────────────────────────────────
export default function MunicipioDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<MunicipioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banderaVisible, setBanderaVisible] = useState(false);
  const [escudoVisible, setEscudoVisible] = useState(false);

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
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <ActivityIndicator color={C.orange} size="large" />
        <Text style={s.loadingTxt}>Cargando municipio...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[s.screen, s.center]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <Text style={s.errorTxt}>{error ?? 'Municipio no encontrado'}</Text>
        <Pressable style={s.errorBtn} onPress={() => router.back()}>
          <Text style={s.errorBtnTxt}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const { municipio: m, festivals = [] } = data;

  const sitios = [
    present(m.sitio_1) ? { nombre: m.sitio_1, maps: m.maps_1, foto: m.foto_sitio_1 } : null,
    present(m.sitio_2) ? { nombre: m.sitio_2, maps: m.maps_2, foto: m.foto_sitio_2 } : null,
    present(m.sitio_3) ? { nombre: m.sitio_3, maps: m.maps_3, foto: m.foto_sitio_3 } : null,
  ].filter(Boolean) as { nombre: string; maps: string | null; foto: string | null }[];

  const hoteles = ([
    present(m.hotel_1) ? { nombre: m.hotel_1, wa: m.wa_1 } : null,
    present(m.hotel_2) ? { nombre: m.hotel_2, wa: m.wa_2 } : null,
    present(m.hotel_3) ? { nombre: m.hotel_3, wa: m.wa_3 } : null,
  ] as const).filter(Boolean) as { nombre: string; wa: string | null }[];

  const mapUrl = m.latitud && m.longitud
    ? `https://www.google.com/maps?q=${m.latitud},${m.longitud}`
    : `https://www.google.com/maps/search/${encodeURIComponent(`${m.nombre}${m.departamento ? `, ${m.departamento}` : ''}, Colombia`)}`;

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={C.orange} />

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero naranja ── */}
        <View style={s.muniHero}>
          {/* Preloaders invisibles: detectan si la imagen carga antes de mostrar el contenedor */}
          {present(m.bandera_url) && (
            <Image
              style={{ position: 'absolute', width: 0, height: 0 }}
              source={{ uri: m.bandera_url }}
              onLoad={() => setBanderaVisible(true)}
              onError={() => setBanderaVisible(false)}
            />
          )}
          {present(m.escudo_url) && (
            <Image
              style={{ position: 'absolute', width: 0, height: 0 }}
              source={{ uri: m.escudo_url }}
              onLoad={() => setEscudoVisible(true)}
              onError={() => setEscudoVisible(false)}
            />
          )}

          {/* Fila: bandera + nombre + escudo — solo visible si cargó correctamente */}
          <View style={s.heroTopRow}>
            {banderaVisible && present(m.bandera_url) && (
              <View style={s.banderaWrap}>
                <Image source={{ uri: m.bandera_url }} style={s.bandera} contentFit="contain" />
              </View>
            )}
            <Text style={s.muniName} numberOfLines={3}>{m.nombre}</Text>
            {escudoVisible && present(m.escudo_url) && (
              <View style={s.escudoWrap}>
                <Image source={{ uri: m.escudo_url }} style={s.escudo} contentFit="contain" />
              </View>
            )}
          </View>

          {/* Departamento · subregión */}
          <View style={s.muniMeta}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.85)" />
            <Text style={s.muniMetaTxt}>
              {m.departamento}{present(m.subregion) ? ` · ${m.subregion}` : ''}
            </Text>
          </View>

          {/* Gentilicio badge */}
          {present(m.gentilicio) && (
            <View style={s.gentilicioBadge}>
              <Text style={s.gentilicioTxt}>{m.gentilicio}</Text>
            </View>
          )}

          {/* Alcalde card dentro del hero */}
          <View style={s.alcaldeHeroCard}>
            <View style={s.alcaldeHeroAvatar}>
              <Text style={{ fontSize: 16 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.alcaldeHeroRol}>Alcalde / Alcaldesa</Text>
              <Text style={s.alcaldeHeroName}>{present(m.alcalde) ? m.alcalde : 'Pendiente de registro'}</Text>
              {present(m.correo_alcalde)
                ? <Text style={s.alcaldeHeroEmail}>{m.correo_alcalde}</Text>
                : <Text style={s.alcaldeHeroEmailNull}>correo no registrado</Text>}
            </View>
            {present(m.correo_alcalde) && (
              <Pressable style={s.alcaldeHeroBtn} onPress={() => openLink(`mailto:${m.correo_alcalde}`)}>
                <Ionicons name="mail-outline" size={14} color="#fff" />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Botón volver ── */}
        <View style={s.backRow}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={16} color={C.orange} />
            <Text style={s.backBtnTxt}>Volver</Text>
          </Pressable>
        </View>

        {/* ── Body ── */}
        <View style={s.body}>

          {/* Stats grid */}
          <View style={s.statsGrid}>
            <StatItem label="🪪 DANE" value={m.codigo_dane ?? '—'} accent />
            <StatItem label="📅 Fundado" value="—" />
            <StatItem
              label="👥 Habitantes"
              value={m.habitantes != null ? Number(m.habitantes).toLocaleString('es-CO') : '—'}
            />
            <StatItem
              label="🌡️ Temperatura"
              value={m.temperatura_promedio != null ? `${m.temperatura_promedio}` : '—'}
              unit={m.temperatura_promedio != null ? '°C' : undefined}
            />
            <StatItem
              label="⛰️ Altura"
              value={m.altura != null ? `${m.altura}` : '—'}
              unit={m.altura != null ? 'msnm' : undefined}
            />
            <StatItem label="🗺️ Subregión" value={m.subregion ?? '—'} />
          </View>

          {/* Mapa */}
          <View style={s.secBlock}>
            <SecLabel>📍 Geolocalización</SecLabel>
            <Pressable style={s.mapCard} onPress={() => openLink(mapUrl)}>
              <View style={s.mapDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.mapLabel}>{m.nombre}{m.departamento ? `, ${m.departamento}` : ''}</Text>
                {m.latitud && m.longitud && (
                  <Text style={s.mapCoords}>{Number(m.latitud).toFixed(4)}, {Number(m.longitud).toFixed(4)}</Text>
                )}
              </View>
              <View style={s.mapBtn}>
                <Ionicons name="map-outline" size={13} color={C.orange} />
                <Text style={s.mapBtnTxt}>Ver en Maps</Text>
              </View>
            </Pressable>
          </View>

          {/* Festivales */}
          {festivals.length > 0 && (
            <View style={s.secBlock}>
              <SecLabel>🎊 Festivales</SecLabel>
              {festivals.map(f => (
                <Pressable key={f.id} style={s.festMini} onPress={() => router.push(`/festival/${f.id}`)}>
                  <View style={s.festMiniDot} />
                  <Text style={s.festMiniName} numberOfLines={1}>{f.nombre}</Text>
                  <Text style={s.festMiniDate}>{f.fecha_inicio ? formatDate(f.fecha_inicio) : 'Sin fecha'}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Sitios turísticos */}
          <View style={s.secBlock}>
            <SecLabel>🗺️ Sitios turísticos</SecLabel>
            {sitios.length > 0
              ? sitios.map((st, i) => <SitioItemWithPhoto key={i} nombre={st.nombre} maps={st.maps} foto={st.foto} />)
              : <SitioItemWithPhoto nombre="Sin registrar" muted />}
          </View>

          {/* Hospedaje */}
          <View style={s.secBlock}>
            <SecLabel>🏨 Hospedaje</SecLabel>
            {hoteles.length > 0
              ? hoteles.map((h, i) => <HotelItem key={i} nombre={h.nombre} wa={h.wa} />)
              : <HotelItem nombre="Sin registrar" muted />}
          </View>

          <View style={{ height: 24 }} />
        </View>
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

  // Hero naranja
  muniHero: {
    backgroundColor: C.orange, paddingTop: 22, paddingBottom: 20, paddingHorizontal: 18,
    alignItems: 'center', gap: 10,
  },
  heroTopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%',
  },
  banderaWrap: {
    width: 60, height: 40, borderRadius: 6, overflow: 'hidden', backgroundColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
    flexShrink: 0,
  },
  bandera: { width: 60, height: 40 },
  banderaPlaceholder: { backgroundColor: 'rgba(255,255,255,0.25)' },
  escudoWrap: {
    width: 50, height: 60, borderRadius: 8, overflow: 'hidden', backgroundColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
    flexShrink: 0,
  },
  escudo: { width: 50, height: 60 },
  escudoPlaceholder: { backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  escudoIni: { fontSize: 18, fontWeight: '900', color: '#fff', fontFamily: 'Outfit_900Black' },
  muniName: {
    fontFamily: 'Outfit_900Black', fontSize: 22, color: '#fff',
    textAlign: 'center', lineHeight: 26, flex: 1,
  },
  muniMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  muniMetaTxt: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  gentilicioBadge: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  gentilicioTxt: { fontSize: 11, fontWeight: '600', color: '#fff', letterSpacing: 0.8 },

  // Alcalde dentro del hero
  alcaldeHeroCard: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11,
    marginTop: 4,
  },
  alcaldeHeroAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  alcaldeHeroRol: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.2, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginBottom: 2 },
  alcaldeHeroName: { fontFamily: 'Outfit_700Bold', fontSize: 13, color: '#fff' },
  alcaldeHeroEmail: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  alcaldeHeroEmailNull: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', marginTop: 2 },
  alcaldeHeroBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Botón volver
  backRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2, backgroundColor: C.bg },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: C.orangeDim, borderWidth: 1, borderColor: C.orangeBorder, borderRadius: 10,
  },
  backBtnTxt: { fontSize: 13, color: C.orange, fontWeight: '600', fontFamily: 'Outfit_700Bold' },

  body: { paddingHorizontal: 16, paddingTop: 14, gap: 16 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statItem: {
    width: '47%', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 13, gap: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  statLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.1, color: C.textDim, fontWeight: '600' },
  statVal: { fontFamily: 'Outfit_800ExtraBold', fontSize: 18, color: C.text },
  statValAccent: { color: C.orange, fontSize: 15 },
  statUnit: { fontSize: 10, color: C.textSub, fontWeight: '400', fontFamily: undefined },

  secBlock: { gap: 8 },
  secLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  secBar: { width: 3, height: 16, backgroundColor: C.orange, borderRadius: 2 },
  secLabelText: { fontFamily: 'Outfit_800ExtraBold', fontSize: 15, color: C.text },

  mapCard: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  mapDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.orange, borderWidth: 3, borderColor: C.orangeDim },
  mapLabel: { fontFamily: 'Outfit_700Bold', fontSize: 13, color: C.text },
  mapCoords: { fontSize: 10, color: C.textDim, marginTop: 2 },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.orangeDim, borderWidth: 1, borderColor: C.orangeBorder,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
  },
  mapBtnTxt: { fontSize: 11, color: C.orange, fontWeight: '600' },

  festMini: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 11, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  festMiniDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.orange },
  festMiniName: { fontFamily: 'Outfit_700Bold', flex: 1, fontSize: 12, color: C.text },
  festMiniDate: { fontSize: 10, color: C.textDim },

  sitioItem: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  sitioFoto: { width: 44, height: 44, borderRadius: 10 },
  sitioIcon: { width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sitioIconTxt: { fontSize: 16 },
  sitioInfo: { flex: 1 },
  sitioName: { fontSize: 12, fontWeight: '600', color: C.text, marginBottom: 2 },
  sitioSub: { fontSize: 10, color: C.orange },
  hotelWa: { fontSize: 10, color: C.green },
  nullItem: { opacity: 0.35 },
});
