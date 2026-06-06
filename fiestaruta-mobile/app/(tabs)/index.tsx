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

// ── Colores ────────────────────────────────────────────────────────────────
const C = {
  bg: '#0c0c0c', surface: '#181818', surface2: '#202020',
  orange: '#FF5E00', orange2: '#FF7533',
  orangeDim: 'rgba(255,94,0,0.12)', orangeBorder: 'rgba(255,94,0,0.25)',
  text: '#FFFFFF', textSub: '#888888', textDim: '#555555',
  border: 'rgba(255,255,255,0.07)',
  green: '#2ECC71', greenDim: 'rgba(46,204,113,0.12)',
} as const;

// ── Chips ──────────────────────────────────────────────────────────────────
const CHIPS = ['Todos', 'Próximos', 'Caribe', 'Andina', 'Pacífico', 'Llanos', 'Amazonia'] as const;
type Chip = typeof CHIPS[number];

// ── Mapa departamento → subregión ──────────────────────────────────────────
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

// ── Normalize: tildes + mayúsculas + trim ──────────────────────────────────
const normalize = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function getSubregion(f: FestivalListItem): string {
  if (f.subregion) return f.subregion;
  return DEPT_SUB[f.departamento ?? ''] ?? '';
}

function festEmoji(nombre: string): string {
  const n = normalize(nombre);
  if (n.includes('flor'))                               return '🌸';
  if (n.includes('vallenato') || n.includes('caja'))   return '🎵';
  if (n.includes('cafe'))                              return '☕';
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

function formatRange(start: string | null, end: string | null): string {
  if (!start) return '';
  const d1 = new Date(start + 'T12:00:00');
  const fmt = (d: Date) =>
    d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!end) return fmt(d1);
  const d2 = new Date(end + 'T12:00:00');
  if (d1.getFullYear() === d2.getFullYear()) {
    const s = d1.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    const e = d2.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${s} – ${e}`;
  }
  return `${fmt(d1)} – ${fmt(d2)}`;
}

function daysLabel(dateStr: string): string {
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

// ── Dropdown de sugerencias (flota sobre el contenido) ────────────────────
function SuggestDrop({
  items,
  onSelect,
  icon,
}: {
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

// ── SectionHead ────────────────────────────────────────────────────────────
function SectionHead({ title, count }: { title: string; count?: number }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionTitle}>{title}</Text>
      {count !== undefined && (
        <View style={s.sectionBadge}>
          <Text style={s.sectionBadgeTxt}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ── FestCard ───────────────────────────────────────────────────────────────
function FestCard({ f, onPress }: { f: FestivalListItem; onPress: () => void }) {
  const emoji   = festEmoji(f.nombre);
  const dateStr = formatRange(f.date_start, f.date_end);
  const days    = f.date_start ? daysLabel(f.date_start) : '';
  const loc     = [f.municipio, f.departamento].filter(Boolean).join(' · ');
  const sub     = getSubregion(f);

  return (
    <Pressable style={s.festCard} onPress={onPress}>
      <View style={s.festHero}>
        <View style={s.heroBg} />
        <View style={s.heroGlowTL} />
        <View style={s.heroGlowBR} />
        <View style={s.heroOverlay} />
        {sub ? (
          <View style={s.heroBadgeSub}>
            <Text style={s.heroBadgeSubTxt}>{sub}</Text>
          </View>
        ) : null}
        <View style={s.heroBadgeProx}>
          <View style={s.heroBadgeProxDot} />
          <Text style={s.heroBadgeProxTxt}>Próximo</Text>
        </View>
        <View style={s.heroContent}>
          <Text style={s.heroEmoji}>{emoji}</Text>
          <Text style={s.heroName} numberOfLines={2}>{f.nombre}</Text>
          <View style={s.heroLocRow}>
            <Ionicons name="location-outline" size={11} color={C.orange} />
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
            <Text style={s.festDateStrong}>{dateStr}</Text>
            <Text style={s.festDateSub}>{days}</Text>
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
  const searchRef = useRef<TextInput>(null);
  const deptRef   = useRef<TextInput>(null);
  const muniRef   = useRef<TextInput>(null);

  const [festivals, setFestivals]   = useState<FestivalListItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeChip, setActiveChip] = useState<Chip>('Todos');

  // Búsqueda general
  const [showSearch, setShowSearch]   = useState(false);
  const [query, setQuery]             = useState('');
  const [showSearchDrop, setShowSearchDrop] = useState(false);

  // Panel filtros
  const [showFilters, setShowFilters] = useState(false);

  // Filtro departamento
  const [deptInput, setDeptInput]     = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [showDeptDrop, setShowDeptDrop] = useState(false);

  // Filtro municipio
  const [muniInput, setMuniInput]     = useState('');
  const [selectedMuni, setSelectedMuni] = useState('');
  const [showMuniDrop, setShowMuniDrop] = useState(false);

  // Filtro fechas
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo]     = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      setFestivals(await getFestivals());
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando festivales');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Sugerencias búsqueda general ──────────────────────────────────────────
  const searchSugg = useMemo(() => {
    if (query.length < 2) return [];
    const q = normalize(query);
    const byName = [...new Set(
      festivals.filter(f => normalize(f.nombre ?? '').includes(q)).map(f => f.nombre).filter(Boolean) as string[]
    )].slice(0, 3);
    const byMuni = [...new Set(
      festivals.filter(f => normalize(f.municipio ?? '').includes(q)).map(f => f.municipio).filter(Boolean) as string[]
    )].slice(0, 2);
    return [...byName, ...byMuni].slice(0, 5);
  }, [festivals, query]);

  // ── Sugerencias departamento ───────────────────────────────────────────────
  const deptSugg = useMemo(() => {
    if (deptInput.length < 2) return [];
    const q = normalize(deptInput);
    return [...new Set(
      festivals.map(f => f.departamento).filter((d): d is string => !!d && normalize(d).includes(q))
    )].sort().slice(0, 5);
  }, [festivals, deptInput]);

  // ── Sugerencias municipio (filtrado por dept seleccionado) ─────────────────
  const muniSugg = useMemo(() => {
    if (muniInput.length < 2) return [];
    const q    = normalize(muniInput);
    const base = selectedDept
      ? festivals.filter(f => f.departamento === selectedDept)
      : festivals;
    return [...new Set(
      base.map(f => f.municipio).filter((m): m is string => !!m && normalize(m).includes(q))
    )].sort().slice(0, 5);
  }, [festivals, muniInput, selectedDept]);

  // ── Lista filtrada ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = festivals;
    if (query.trim()) {
      const q = normalize(query.trim());
      r = r.filter(f =>
        normalize(f.nombre ?? '').includes(q) ||
        normalize(f.municipio ?? '').includes(q) ||
        normalize(f.departamento ?? '').includes(q)
      );
    }
    if (activeChip === 'Próximos') {
      r = r.filter(f => !!f.date_start);
    } else if (activeChip !== 'Todos') {
      r = r.filter(f => getSubregion(f) === activeChip);
    }
    if (selectedDept) r = r.filter(f => f.departamento === selectedDept);
    if (selectedMuni) r = r.filter(f => f.municipio    === selectedMuni);
    if (filterFrom)   r = r.filter(f => !!f.date_start && f.date_start >= filterFrom);
    if (filterTo)     r = r.filter(f => !f.date_start  || f.date_start <= filterTo);
    return r;
  }, [festivals, query, activeChip, selectedDept, selectedMuni, filterFrom, filterTo]);

  const featured = useMemo(() =>
    filtered.filter(f => !!f.date_start).sort((a, b) =>
      a.date_start! > b.date_start! ? 1 : -1
    ), [filtered]);

  const noDate = useMemo(() =>
    filtered.filter(f => !f.date_start), [filtered]);

  const hasActiveFilters = !!(selectedDept || selectedMuni || filterFrom || filterTo || query);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function toggleSearch() {
    setShowSearch(v => {
      if (!v) setTimeout(() => searchRef.current?.focus(), 80);
      else { setQuery(''); setShowSearchDrop(false); }
      return !v;
    });
  }

  function toggleFilters() {
    setShowFilters(v => {
      if (v) {
        setDeptInput(''); setSelectedDept('');
        setMuniInput(''); setSelectedMuni('');
        setFilterFrom(''); setFilterTo('');
        setShowDeptDrop(false); setShowMuniDrop(false);
      }
      return !v;
    });
  }

  function clearAll() {
    setQuery(''); setSelectedDept(''); setDeptInput('');
    setSelectedMuni(''); setMuniInput('');
    setFilterFrom(''); setFilterTo('');
    setShowSearchDrop(false); setShowDeptDrop(false); setShowMuniDrop(false);
  }

  function pickSearch(v: string) { setQuery(v); setShowSearchDrop(false); }

  function pickDept(v: string) {
    setSelectedDept(v); setDeptInput(v); setShowDeptDrop(false);
    setSelectedMuni(''); setMuniInput('');
  }
  function clearDept() {
    setSelectedDept(''); setDeptInput('');
    setSelectedMuni(''); setMuniInput('');
  }

  function pickMuni(v: string) { setSelectedMuni(v); setMuniInput(v); setShowMuniDrop(false); }
  function clearMuni() { setSelectedMuni(''); setMuniInput(''); }

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.logo}>
          Fest<Text style={{ color: C.orange }}>Quest</Text>
        </Text>
        <View style={s.headerBtns}>
          <Pressable
            style={[s.hBtn, (showFilters || !!(selectedDept || selectedMuni || filterFrom || filterTo)) && s.hBtnActive]}
            onPress={toggleFilters}
          >
            <Ionicons
              name="options-outline" size={17}
              color={(showFilters || !!(selectedDept || selectedMuni)) ? C.orange : C.text}
            />
            {(selectedDept || selectedMuni || filterFrom || filterTo) && !showFilters && (
              <View style={s.hBtnDot} />
            )}
          </Pressable>
          <Pressable style={[s.hBtn, showSearch && s.hBtnActive]} onPress={toggleSearch}>
            <Ionicons
              name={showSearch ? 'close-outline' : 'search-outline'} size={17}
              color={showSearch ? C.orange : C.text}
            />
          </Pressable>
        </View>
      </View>

      {/* ── Zona interactiva con dropdowns — FUERA del ScrollView ── */}
      <View style={s.interactiveZone}>

        {/* Búsqueda general + autocomplete */}
        {showSearch && (
          <View style={s.searchWrap}>
            <View style={[s.inputRow, showSearchDrop && searchSugg.length > 0 && s.inputRowOpen]}>
              <Ionicons name="search-outline" size={14} color={C.textDim} />
              <TextInput
                ref={searchRef}
                style={s.inputTxt}
                placeholder="Festival, municipio, departamento..."
                placeholderTextColor={C.textDim}
                value={query}
                onChangeText={t => { setQuery(t); setShowSearchDrop(t.length >= 2); }}
                onFocus={() => { if (query.length >= 2) setShowSearchDrop(true); }}
                onBlur={() => setTimeout(() => setShowSearchDrop(false), 150)}
                returnKeyType="search"
                autoCorrect={false}
              />
              {query.length > 0 && (
                <Pressable onPress={() => { setQuery(''); setShowSearchDrop(false); }}>
                  <Ionicons name="close-circle" size={15} color={C.textDim} />
                </Pressable>
              )}
            </View>
            {showSearchDrop && (
              <SuggestDrop items={searchSugg} onSelect={pickSearch} icon="search-outline" />
            )}
          </View>
        )}

        {/* Filtros dept / municipio / fechas */}
        {showFilters && (
          <View style={s.filterPanel}>
            <View style={s.filterRow}>

              {/* Departamento */}
              <View style={[s.filterCell, { zIndex: showDeptDrop ? 30 : 10 }]}>
                <View style={[s.inputRow, s.inputRowSm,
                  selectedDept && s.inputRowSelected,
                  showDeptDrop && deptSugg.length > 0 && s.inputRowOpen,
                ]}>
                  <Ionicons name="business-outline" size={12} color={selectedDept ? C.orange : C.textDim} />
                  <TextInput
                    ref={deptRef}
                    style={[s.inputTxt, s.inputTxtSm]}
                    placeholder="Departamento..."
                    placeholderTextColor={C.textDim}
                    value={deptInput}
                    onChangeText={t => {
                      setDeptInput(t); setSelectedDept('');
                      setShowDeptDrop(t.length >= 2);
                    }}
                    onFocus={() => { if (deptInput.length >= 2) setShowDeptDrop(true); }}
                    onBlur={() => setTimeout(() => setShowDeptDrop(false), 150)}
                    autoCorrect={false}
                  />
                  {deptInput.length > 0 && (
                    <Pressable onPress={clearDept}>
                      <Ionicons name="close-circle" size={13} color={C.textDim} />
                    </Pressable>
                  )}
                </View>
                {showDeptDrop && (
                  <SuggestDrop items={deptSugg} onSelect={pickDept} icon="business-outline" />
                )}
              </View>

              {/* Municipio */}
              <View style={[s.filterCell, { zIndex: showMuniDrop ? 30 : 10 }]}>
                <View style={[s.inputRow, s.inputRowSm,
                  selectedMuni && s.inputRowSelected,
                  showMuniDrop && muniSugg.length > 0 && s.inputRowOpen,
                ]}>
                  <Ionicons name="location-outline" size={12} color={selectedMuni ? C.orange : C.textDim} />
                  <TextInput
                    ref={muniRef}
                    style={[s.inputTxt, s.inputTxtSm]}
                    placeholder={selectedDept ? `En ${selectedDept.split(' ')[0]}…` : 'Municipio...'}
                    placeholderTextColor={C.textDim}
                    value={muniInput}
                    onChangeText={t => {
                      setMuniInput(t); setSelectedMuni('');
                      setShowMuniDrop(t.length >= 2);
                    }}
                    onFocus={() => { if (muniInput.length >= 2) setShowMuniDrop(true); }}
                    onBlur={() => setTimeout(() => setShowMuniDrop(false), 150)}
                    autoCorrect={false}
                  />
                  {muniInput.length > 0 && (
                    <Pressable onPress={clearMuni}>
                      <Ionicons name="close-circle" size={13} color={C.textDim} />
                    </Pressable>
                  )}
                </View>
                {showMuniDrop && (
                  <SuggestDrop items={muniSugg} onSelect={pickMuni} icon="location-outline" />
                )}
              </View>
            </View>

            {/* Fechas */}
            <View style={s.filterRow}>
              <View style={[s.inputRow, s.inputRowSm, s.filterCell, filterFrom && s.inputRowSelected]}>
                <Ionicons name="calendar-outline" size={12} color={filterFrom ? C.orange : C.textDim} />
                <TextInput
                  style={[s.inputTxt, s.inputTxtSm]}
                  placeholder="Desde  AAAA-MM-DD"
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
                  placeholder="Hasta  AAAA-MM-DD"
                  placeholderTextColor={C.textDim}
                  value={filterTo}
                  onChangeText={setFilterTo}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            {hasActiveFilters && (
              <Pressable style={s.clearBtn} onPress={clearAll}>
                <Ionicons name="close-circle-outline" size={12} color={C.orange} />
                <Text style={s.clearBtnTxt}>Limpiar filtros</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Chips subregión */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={s.chipsScroll} contentContainerStyle={s.chipsContent}
          keyboardShouldPersistTaps="handled"
        >
          {CHIPS.map(chip => (
            <Pressable
              key={chip}
              style={[s.chip, activeChip === chip && s.chipActive]}
              onPress={() => setActiveChip(chip)}
            >
              <Text style={[s.chipTxt, activeChip === chip && s.chipTxtActive]}>{chip}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── Lista principal ── */}
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={C.orange} colors={[C.orange]}
          />
        }
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

        {!loading && !error && featured.length > 0 && (
          <>
            <SectionHead title="Destacados" />
            {featured.map(f => (
              <FestCard key={f.id} f={f} onPress={() => router.push(`/festival/${f.id}`)} />
            ))}
          </>
        )}

        {!loading && !error && noDate.length > 0 && (
          <>
            <SectionHead title="Sin fecha confirmada" count={noDate.length} />
            {noDate.map(f => (
              <MiniCard key={f.id} f={f} onPress={() => router.push(`/festival/${f.id}`)} />
            ))}
          </>
        )}

        {!loading && !error && featured.length === 0 && noDate.length === 0 && (
          <View style={s.center}>
            <Text style={{ fontSize: 32 }}>🔍</Text>
            <Text style={s.emptyTxt}>
              {hasActiveFilters
                ? 'Sin resultados para los filtros aplicados'
                : 'No hay festivales disponibles'}
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

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10,
    backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  logo: {
    fontFamily: 'Outfit_900Black', fontWeight: '900',
    fontSize: 22, color: C.text, letterSpacing: -0.5,
  },
  headerBtns: { flexDirection: 'row', gap: 8 },
  hBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  hBtnActive: { backgroundColor: C.orangeDim, borderColor: C.orangeBorder },
  hBtnDot: {
    position: 'absolute', top: 6, right: 6,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: C.orange, borderWidth: 1.5, borderColor: C.bg,
  },

  // Zona interactiva (fuera del scroll para que los dropdowns floten)
  interactiveZone: {
    backgroundColor: C.bg,
    borderBottomWidth: 1, borderBottomColor: C.border,
    zIndex: 50,
  },

  // Search wrap
  searchWrap: {
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4,
    zIndex: 100,
  },

  // Filter panel
  filterPanel: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 8,
    zIndex: 90,
  },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterCell: { flex: 1, position: 'relative' },

  // Input genérico (search, dept, muni)
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 13, paddingHorizontal: 13, paddingVertical: 10,
  },
  inputRowSm:       { paddingVertical: 8 },
  inputRowOpen:     { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomColor: 'transparent' },
  inputRowSelected: { borderColor: C.orangeBorder, backgroundColor: C.orangeDim },
  inputTxt:         { flex: 1, fontSize: 13, color: C.text, padding: 0 },
  inputTxtSm:       { fontSize: 12 },

  // Dropdown flotante
  drop: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
    backgroundColor: C.surface2,
    borderWidth: 1, borderTopWidth: 0, borderColor: C.border,
    borderBottomLeftRadius: 13, borderBottomRightRadius: 13,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000', shadowOpacity: 0.5,
    shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
  },
  dropRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  dropRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  dropTxt: { flex: 1, fontSize: 13, color: C.text },

  // Clear btn
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 11, paddingVertical: 6,
    backgroundColor: C.orangeDim, borderRadius: 8, borderWidth: 1, borderColor: C.orangeBorder,
  },
  clearBtnTxt: { fontSize: 11, color: C.orange, fontWeight: '600' },

  // Chips
  chipsScroll: { flexGrow: 0 },
  chipsContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  chipActive: { backgroundColor: C.orangeDim, borderColor: C.orangeBorder },
  chipTxt: {
    fontSize: 11, fontWeight: '600', color: C.textSub, letterSpacing: 0.4,
    fontFamily: 'Outfit_700Bold',
  },
  chipTxtActive: { color: C.orange2 },

  // Section head
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Outfit_700Bold', fontWeight: '700',
    fontSize: 11, color: C.textSub, textTransform: 'uppercase', letterSpacing: 1,
  },
  sectionBadge: {
    backgroundColor: C.surface2, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  sectionBadgeTxt: { fontSize: 10, color: C.textDim, fontWeight: '600' },

  // FestCard
  festCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  festHero: { height: 150, overflow: 'hidden' },
  heroBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#110500' },
  heroGlowTL: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(255,94,0,0.22)', left: -60, top: -80,
  },
  heroGlowBR: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,94,0,0.10)', right: -30, bottom: -40,
  },
  heroOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 90,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroBadgeSub: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  heroBadgeSubTxt: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: 0.5 },
  heroBadgeProx: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(46,204,113,0.15)',
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.3)',
  },
  heroBadgeProxDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#2ECC71' },
  heroBadgeProxTxt: { fontSize: 9, fontWeight: '700', color: '#2ECC71', letterSpacing: 0.5 },
  heroContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 14, paddingBottom: 12,
  },
  heroEmoji: { fontSize: 18, marginBottom: 4 },
  heroName: {
    fontFamily: 'Outfit_800ExtraBold', fontWeight: '800',
    fontSize: 18, color: C.text, lineHeight: 21, marginBottom: 4,
  },
  heroLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroLocTxt: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
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
  festDateStrong: {
    fontFamily: 'Outfit_700Bold', fontWeight: '700', fontSize: 12, color: C.orange,
  },
  festDateSub: { fontSize: 11, color: C.textSub, marginTop: 1 },
  arrowBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.orangeDim, borderWidth: 1, borderColor: C.orangeBorder,
    alignItems: 'center', justifyContent: 'center',
  },

  // MiniCard
  miniCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  miniDot: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.orangeDim, borderWidth: 1, borderColor: C.orangeBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  miniEmoji: { fontSize: 18 },
  miniInfo: { flex: 1 },
  miniName: {
    fontFamily: 'Outfit_700Bold', fontWeight: '700',
    fontSize: 13, color: C.text, marginBottom: 3,
  },
  miniMeta: { fontSize: 11, color: C.textSub },

  // Estados
  center: { paddingVertical: 56, alignItems: 'center', gap: 12 },
  loadingTxt: { color: C.textSub, fontSize: 13 },
  errorTxt: {
    color: '#ff4444', fontSize: 13, fontWeight: '600',
    textAlign: 'center', paddingHorizontal: 32,
  },
  retryBtn: {
    backgroundColor: C.orange, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10,
  },
  retryBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyTxt: { color: C.textSub, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
});
