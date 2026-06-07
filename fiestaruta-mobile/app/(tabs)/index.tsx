import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFestivals, type FestivalListItem } from '../services/festquestApi';

// ── Colores crema/cálido ───────────────────────────────────────────────────
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
  greenDim: 'rgba(22,163,74,0.10)',
} as const;

// ── Gradientes por subregión ───────────────────────────────────────────────
const SUB_GRAD: Record<string, readonly [string, string]> = {
  'Caribe':   ['#FF8C42', '#FF5500'],
  'Andina':   ['#A855F7', '#7C3AED'],
  'Pacífico': ['#3B9EE8', '#1D4ED8'],
  'Llanos':   ['#34A853', '#059669'],
  'Amazonia': ['#26C6DA', '#0D9488'],
};

const DEPT_SUB: Record<string, string> = {
  'Atlántico': 'Caribe', 'Bolívar': 'Caribe', 'Cesar': 'Caribe', 'Córdoba': 'Caribe',
  'La Guajira': 'Caribe', 'Magdalena': 'Caribe', 'Sucre': 'Caribe',
  'Archipiélago De San Andrés': 'Caribe',
  'Antioquia': 'Andina', 'Boyacá': 'Andina', 'Caldas': 'Andina', 'Cundinamarca': 'Andina',
  'Bogotá': 'Andina', 'Huila': 'Andina', 'Norte De Santander': 'Andina', 'Quindio': 'Andina',
  'Risaralda': 'Andina', 'Santander': 'Andina', 'Tolima': 'Andina',
  'Cauca': 'Pacífico', 'Chocó': 'Pacífico', 'Nariño': 'Pacífico', 'Valle Del Cauca': 'Pacífico',
  'Arauca': 'Llanos', 'Casanare': 'Llanos', 'Meta': 'Llanos', 'Vichada': 'Llanos',
  'Amazonas': 'Amazonia', 'Caquetá': 'Amazonia', 'Guainía': 'Amazonia',
  'Guaviare': 'Amazonia', 'Putumayo': 'Amazonia', 'Vaupés': 'Amazonia',
};

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function getSubregion(f: FestivalListItem) {
  return f.subregion || DEPT_SUB[f.departamento ?? ''] || '';
}

function festEmoji(nombre: string) {
  const n = normalize(nombre);
  if (n.includes('flor'))                               return '🌸';
  if (n.includes('vallenato') || n.includes('caja'))   return '🎵';
  if (n.includes('cafe'))                               return '☕';
  if (n.includes('carnaval') || n.includes('barranq')) return '🎭';
  if (n.includes('porro') || n.includes('cumbia'))     return '🥁';
  if (n.includes('cangrejo') || n.includes('marisco')) return '🦀';
  if (n.includes('toro') || n.includes('taur'))        return '🐂';
  if (n.includes('agua') || n.includes('rio') || n.includes('mar')) return '🌊';
  if (n.includes('nav') || n.includes('alumbrado'))    return '🎄';
  if (n.includes('inti') || n.includes('indigena'))    return '☀️';
  if (n.includes('jazz') || n.includes('musica'))      return '🎶';
  if (n.includes('retorno') || n.includes('fiest'))    return '🎊';
  return '🎉';
}

function formatRange(start: string | null, end: string | null) {
  if (!start) return '';
  const d1 = new Date(start + 'T12:00:00');
  const fmt = (d: Date) =>
    d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!end) return fmt(d1);
  const d2 = new Date(end + 'T12:00:00');
  if (d1.getFullYear() === d2.getFullYear()) {
    return `${d1.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} – ${d2.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return `${fmt(d1)} – ${fmt(d2)}`;
}

function daysLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0)   return 'Pasado';
  if (diff === 0) return '¡Hoy!';
  if (diff === 1) return 'Mañana';
  if (diff < 30)  return `En ${diff} días`;
  if (diff < 365) return `En ${Math.round(diff / 30)} mes${Math.round(diff / 30) > 1 ? 'es' : ''}`;
  return 'Próximo año';
}

function isUpcoming(dateStr: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return d >= today;
}

// ── SuggestDrop ────────────────────────────────────────────────────────────
function SuggestDrop({ items, onSelect, icon }: {
  items: string[];
  onSelect: (v: string) => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  if (!items.length) return null;
  return (
    <View style={s.drop}>
      {items.map((item, i) => (
        <Pressable
          key={item + i}
          style={[s.dropRow, i < items.length - 1 && s.dropRowBorder]}
          onPress={() => onSelect(item)}
        >
          <Ionicons name={icon ?? 'search-outline'} size={12} color={C.textDim} />
          <Text style={s.dropTxt} numberOfLines={1}>{item}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── FestCard ───────────────────────────────────────────────────────────────
function FestCard({ f, onPress }: { f: FestivalListItem; onPress: () => void }) {
  const sub     = getSubregion(f);
  const emoji   = festEmoji(f.nombre);
  const dateStr = formatRange(f.date_start, f.date_end);
  const days    = f.date_start ? daysLabel(f.date_start) : '';
  const loc     = [f.municipio, f.departamento].filter(Boolean).join(' · ');
  const upcoming = isUpcoming(f.date_start);
  const grad    = (SUB_GRAD[sub] ?? ['#FF8C42', '#FF5500']) as [string, string];

  return (
    <Pressable style={s.festCard} onPress={onPress}>
      <View style={s.festHero}>
        {f.foto_url ? (
          <Image
            source={{ uri: f.foto_url }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={grad}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.72)']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 0, y: 1 }}
        />
        {sub ? (
          <View style={s.heroBadgeSub}>
            <Text style={s.heroBadgeSubTxt}>{sub}</Text>
          </View>
        ) : null}
        {upcoming && (
          <View style={s.heroBadgeProx}>
            <View style={s.heroBadgeProxDot} />
            <Text style={s.heroBadgeProxTxt}>Próximo</Text>
          </View>
        )}
        <View style={s.heroContent}>
          <Text style={s.heroEmoji}>{emoji}</Text>
          <Text style={s.heroName} numberOfLines={2}>{f.nombre}</Text>
          <View style={s.heroLocRow}>
            <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.8)" />
            <Text style={s.heroLocTxt} numberOfLines={1}>{loc}</Text>
          </View>
        </View>
      </View>
      <View style={s.festFooter}>
        <View style={s.festDateRow}>
          <View style={s.festDateIcon}>
            <Ionicons name="calendar-outline" size={13} color={C.orange} />
          </View>
          <View>
            <Text style={s.festDateStrong}>{dateStr || 'Fecha por confirmar'}</Text>
            {days ? <Text style={s.festDateSub}>{days}</Text> : null}
          </View>
        </View>
        <View style={s.arrowBtn}>
          <Ionicons name="arrow-forward" size={13} color={C.orange} />
        </View>
      </View>
    </Pressable>
  );
}

// ── MiniCard ───────────────────────────────────────────────────────────────
function MiniCard({ f, onPress }: { f: FestivalListItem; onPress: () => void }) {
  const emoji = festEmoji(f.nombre);
  const meta  = [f.municipio, f.departamento, getSubregion(f)].filter(Boolean).join(' · ');
  return (
    <Pressable style={s.miniCard} onPress={onPress}>
      <View style={s.miniDot}>
        <Text style={s.miniEmoji}>{emoji}</Text>
      </View>
      <View style={s.miniInfo}>
        <Text style={s.miniName} numberOfLines={1}>{f.nombre}</Text>
        <Text style={s.miniMeta} numberOfLines={1}>{meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={C.textDim} />
    </Pressable>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const deptRef = useRef<TextInput>(null);
  const muniRef = useRef<TextInput>(null);

  const [festivals, setFestivals]   = useState<FestivalListItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [deptInput, setDeptInput]     = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [showDeptDrop, setShowDeptDrop] = useState(false);
  const [muniInput, setMuniInput]     = useState('');
  const [selectedMuni, setSelectedMuni] = useState('');
  const [showMuniDrop, setShowMuniDrop] = useState(false);
  const [filterFrom, setFilterFrom]   = useState('');
  const [filterTo, setFilterTo]       = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 60000);
    try {
      setFestivals(await getFestivals(ctrl.signal));
    } catch (e: any) {
      const isTimeout = e?.name === 'AbortError';
      setError(isTimeout
        ? 'El servidor tardó demasiado (60s). Toca Reintentar.'
        : (e?.message ?? 'Error cargando festivales'));
    } finally {
      clearTimeout(tid);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deptSugg = useMemo(() => {
    if (deptInput.length < 2) return [];
    const q = normalize(deptInput);
    return [...new Set(festivals.map(f => f.departamento).filter((d): d is string => !!d && normalize(d).includes(q)))].sort().slice(0, 5);
  }, [festivals, deptInput]);

  const muniSugg = useMemo(() => {
    if (muniInput.length < 2) return [];
    const q = normalize(muniInput);
    const base = selectedDept ? festivals.filter(f => f.departamento === selectedDept) : festivals;
    return [...new Set(base.map(f => f.municipio).filter((m): m is string => !!m && normalize(m).includes(q)))].sort().slice(0, 5);
  }, [festivals, muniInput, selectedDept]);

  const filtered = useMemo(() => {
    let r = festivals;
    if (selectedDept) {
      r = r.filter(f => f.departamento === selectedDept);
    } else if (deptInput.trim().length >= 2) {
      const q = normalize(deptInput.trim());
      r = r.filter(f => normalize(f.departamento ?? '').includes(q));
    }
    if (selectedMuni) {
      r = r.filter(f => f.municipio === selectedMuni);
    } else if (muniInput.trim().length >= 2) {
      const q = normalize(muniInput.trim());
      r = r.filter(f => normalize(f.municipio ?? '').includes(q));
    }
    if (filterFrom) r = r.filter(f => !!f.date_start && f.date_start >= filterFrom);
    if (filterTo)   r = r.filter(f => !f.date_end   || f.date_end   <= filterTo);
    return r;
  }, [festivals, selectedDept, selectedMuni, deptInput, muniInput, filterFrom, filterTo]);

  const featured = useMemo(() =>
    filtered.filter(f => !!f.date_start).sort((a, b) => a.date_start! > b.date_start! ? 1 : -1),
    [filtered]);

  const noDate = useMemo(() => filtered.filter(f => !f.date_start), [filtered]);

  const hasActiveFilters = !!(selectedDept || selectedMuni || filterFrom || filterTo ||
    deptInput.trim().length >= 2 || muniInput.trim().length >= 2);

  function clearAll() {
    setSelectedDept(''); setDeptInput(''); setSelectedMuni(''); setMuniInput('');
    setFilterFrom(''); setFilterTo(''); setShowDeptDrop(false); setShowMuniDrop(false);
  }

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.logo}>Fest<Text style={{ color: C.orange }}>Quest</Text></Text>
        <Text style={s.tagline}>Descubre fiestas de Colombia 🇨🇴</Text>
        <Text style={s.description}>Explora las fiestas y festivales de los municipios de Colombia. Filtra por departamento, municipio o fecha y descubre la cultura de cada región 🇨🇴</Text>
      </View>

      {/* ── Zona interactiva ── */}
      <View style={s.interactiveZone}>
        <View style={s.filterPanel}>
            <View style={s.filterRow}>
              <View style={[s.filterCell, { zIndex: showDeptDrop ? 30 : 10 }]}>
                <View style={[s.inputRow, s.inputRowSm, selectedDept && s.inputRowSelected, showDeptDrop && deptSugg.length > 0 && s.inputRowOpen]}>
                  <Ionicons name="business-outline" size={12} color={selectedDept ? C.orange : C.textDim} />
                  <TextInput
                    ref={deptRef}
                    style={[s.inputTxt, s.inputTxtSm]}
                    placeholder="Departamento..."
                    placeholderTextColor={C.textDim}
                    value={deptInput}
                    onChangeText={t => { setDeptInput(t); setSelectedDept(''); setShowDeptDrop(t.length >= 2); }}
                    onFocus={() => { if (deptInput.length >= 2) setShowDeptDrop(true); }}
                    onBlur={() => setTimeout(() => setShowDeptDrop(false), 150)}
                    autoCorrect={false}
                  />
                  {deptInput.length > 0 && (
                    <Pressable onPress={() => { setSelectedDept(''); setDeptInput(''); setSelectedMuni(''); setMuniInput(''); }}>
                      <Ionicons name="close-circle" size={13} color={C.textDim} />
                    </Pressable>
                  )}
                </View>
                {showDeptDrop && (
                  <SuggestDrop items={deptSugg} onSelect={v => { setSelectedDept(v); setDeptInput(v); setShowDeptDrop(false); setSelectedMuni(''); setMuniInput(''); }} icon="business-outline" />
                )}
              </View>

              <View style={[s.filterCell, { zIndex: showMuniDrop ? 30 : 10 }]}>
                <View style={[s.inputRow, s.inputRowSm, selectedMuni && s.inputRowSelected, showMuniDrop && muniSugg.length > 0 && s.inputRowOpen]}>
                  <Ionicons name="location-outline" size={12} color={selectedMuni ? C.orange : C.textDim} />
                  <TextInput
                    ref={muniRef}
                    style={[s.inputTxt, s.inputTxtSm]}
                    placeholder={selectedDept ? `En ${selectedDept.split(' ')[0]}…` : 'Municipio...'}
                    placeholderTextColor={C.textDim}
                    value={muniInput}
                    onChangeText={t => { setMuniInput(t); setSelectedMuni(''); setShowMuniDrop(t.length >= 2); }}
                    onFocus={() => { if (muniInput.length >= 2) setShowMuniDrop(true); }}
                    onBlur={() => setTimeout(() => setShowMuniDrop(false), 150)}
                    autoCorrect={false}
                  />
                  {muniInput.length > 0 && (
                    <Pressable onPress={() => { setSelectedMuni(''); setMuniInput(''); }}>
                      <Ionicons name="close-circle" size={13} color={C.textDim} />
                    </Pressable>
                  )}
                </View>
                {showMuniDrop && (
                  <SuggestDrop items={muniSugg} onSelect={v => { setSelectedMuni(v); setMuniInput(v); setShowMuniDrop(false); }} icon="location-outline" />
                )}
              </View>
            </View>

            <View style={s.filterRow}>
              <View style={[s.inputRow, s.inputRowSm, s.filterCell, filterFrom && s.inputRowSelected]}>
                <Ionicons name="calendar-outline" size={12} color={filterFrom ? C.orange : C.textDim} />
                <TextInput
                  style={[s.inputTxt, s.inputTxtSm]}
                  placeholder="Desde"
                  placeholderTextColor={C.textDim}
                  value={filterFrom}
                  onChangeText={setFilterFrom}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={[s.inputRow, s.inputRowSm, s.filterCell, filterTo && s.inputRowSelected]}>
                <Ionicons name="calendar-outline" size={12} color={filterTo ? C.orange : C.textDim} />
                <TextInput
                  style={[s.inputTxt, s.inputTxtSm]}
                  placeholder="Hasta"
                  placeholderTextColor={C.textDim}
                  value={filterTo}
                  onChangeText={setFilterTo}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            <Pressable
              style={[s.clearBtn, !hasActiveFilters && s.clearBtnOff]}
              onPress={hasActiveFilters ? clearAll : undefined}
            >
              <Ionicons name="close-circle-outline" size={13} color={hasActiveFilters ? C.orange : C.textDim} />
              <Text style={[s.clearBtnTxt, !hasActiveFilters && { color: C.textDim }]}>Limpiar filtros</Text>
            </Pressable>
          </View>
      </View>

      {/* ── Lista ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={C.orange} colors={[C.orange]} />}
      >
        {loading && (
          <View style={s.center}>
            <ActivityIndicator color={C.orange} size="large" />
            <Text style={s.loadingTxt}>Cargando festivales...</Text>
          </View>
        )}

        {!loading && error && (
          <View style={s.center}>
            <Text style={s.errorTxt}>{error}</Text>
            <Pressable style={s.retryBtn} onPress={() => load()}>
              <Text style={s.retryBtnTxt}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && featured.map(f => <FestCard key={f.id} f={f} onPress={() => router.push(`/festival/${f.id}`)} />)}
        {!loading && !error && noDate.map(f => <MiniCard key={f.id} f={f} onPress={() => router.push(`/festival/${f.id}`)} />)}

        {!loading && !error && featured.length === 0 && noDate.length === 0 && !loading && (
          <View style={s.center}>
            <Text style={{ fontSize: 32 }}>🔍</Text>
            <Text style={s.emptyTxt}>
              {hasActiveFilters ? 'Sin resultados para los filtros aplicados' : 'No hay festivales disponibles'}
            </Text>
            {hasActiveFilters && (
              <Pressable style={s.clearBtn} onPress={clearAll}>
                <Text style={s.clearBtnTxt}>Limpiar filtros</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  header: {
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12,
    backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  logo: { fontFamily: 'Outfit_900Black', fontSize: 24, color: C.text, letterSpacing: -0.5 },
  tagline: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.textSub, marginTop: 1 },
  description: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#333333', marginTop: 8, lineHeight: 21 },

  interactiveZone: { backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border, zIndex: 50 },
  filterPanel: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 8, zIndex: 90 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterCell: { flex: 1, position: 'relative' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  inputRowSm:       { paddingVertical: 8 },
  inputRowOpen:     { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomColor: 'transparent' },
  inputRowSelected: { borderColor: C.orangeBorder, backgroundColor: C.orangeDim },
  inputTxt:         { flex: 1, fontSize: 13, color: C.text, padding: 0 },
  inputTxtSm:       { fontSize: 12 },

  drop: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
    backgroundColor: C.surface, borderWidth: 1, borderTopWidth: 0, borderColor: C.border,
    borderBottomLeftRadius: 13, borderBottomRightRadius: 13, overflow: 'hidden',
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
  },
  dropRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  dropRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  dropTxt: { flex: 1, fontSize: 13, color: C.text },

  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: C.orangeDim, borderRadius: 10, borderWidth: 1, borderColor: C.orangeBorder,
  },
  clearBtnOff: { backgroundColor: 'rgba(0,0,0,0.04)', borderColor: C.border },
  clearBtnTxt: { fontSize: 12, color: C.orange, fontWeight: '600' },

  festCard: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  festHero: { height: 185, overflow: 'hidden' },
  heroBadgeSub: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
  },
  heroBadgeSubTxt: { fontSize: 10, color: '#fff', fontWeight: '600', letterSpacing: 0.4 },
  heroBadgeProx: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(22,163,74,0.9)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4,
  },
  heroBadgeProxDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  heroBadgeProxTxt: { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingBottom: 13 },
  heroEmoji: { fontSize: 18, marginBottom: 4 },
  heroName: { fontFamily: 'Outfit_800ExtraBold', fontSize: 18, color: '#fff', lineHeight: 21, marginBottom: 4 },
  heroLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroLocTxt: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  festFooter: {
    paddingHorizontal: 14, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: C.border,
  },
  festDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  festDateIcon: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: C.orangeDim, borderWidth: 1, borderColor: C.orangeBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  festDateStrong: { fontFamily: 'Outfit_700Bold', fontSize: 12, color: C.text },
  festDateSub: { fontSize: 11, color: C.textSub, marginTop: 1 },
  arrowBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.orangeDim, borderWidth: 1, borderColor: C.orangeBorder,
    alignItems: 'center', justifyContent: 'center',
  },

  miniCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  miniDot: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: C.orangeDim, borderWidth: 1, borderColor: C.orangeBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  miniEmoji: { fontSize: 20 },
  miniInfo: { flex: 1 },
  miniName: { fontFamily: 'Outfit_700Bold', fontSize: 13, color: C.text, marginBottom: 3 },
  miniMeta: { fontSize: 11, color: C.textSub },

  center: { paddingVertical: 56, alignItems: 'center', gap: 12 },
  loadingTxt: { color: C.textSub, fontSize: 13 },
  errorTxt: { color: '#D32F2F', fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { backgroundColor: C.orange, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10 },
  retryBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyTxt: { color: C.textSub, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
});
