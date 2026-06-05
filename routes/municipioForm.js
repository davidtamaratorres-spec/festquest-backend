const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function ok(val) { return val !== null && val !== undefined && val !== 'N/A' && String(val).trim() !== ''; }
function v(val) { return ok(val) ? String(val) : ''; }
function isUrl(s) { if (!s) return true; try { new URL(s); return true; } catch { return false; } }
function isWa(s) { if (!s) return true; return /^https?:\/\/wa\.me\//.test(s); }

// ── CSS compartido ─────────────────────────────────────────────────────────
const SHARED_CSS = `
:root {
  --orange: #ff6b35; --orange-glow: #ff6b3530;
  --bg: #07070f; --surface: #0d0d1c; --surface2: #13132a;
  --border: #1c1c38; --border-active: #ff6b35;
  --text: #eeeeff; --muted: #5a5a80;
  --green: #00d084; --green-bg: #00d08415;
  --yellow: #f59e0b; --red: #ef4444; --red-bg: #ef444415;
  --font-body: 'DM Sans', sans-serif; --font-display: 'Syne', sans-serif;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; font-size: 16px; }
body { font-family: var(--font-body); background: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; }

.topbar {
  position: sticky; top: 0; z-index: 200;
  background: var(--surface); border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px; height: 60px;
}
.topbar-left { display: flex; align-items: center; gap: 16px; }
.logo { font-family: var(--font-display); font-weight: 800; font-size: 1.3rem; color: var(--orange); letter-spacing: -0.5px; }
.crumb { font-size: 0.9rem; color: var(--muted); }
.crumb strong { color: var(--text); font-weight: 600; }
.topbar-right { display: flex; align-items: center; gap: 12px; }
.progress-pill {
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 20px; padding: 6px 14px;
  font-size: 0.8rem; color: var(--muted);
  display: flex; align-items: center; gap: 8px;
}
.progress-pill .pct { font-weight: 700; color: var(--orange); font-size: 0.9rem; }

.layout { display: grid; grid-template-columns: 280px 1fr; min-height: calc(100vh - 60px); }
@media (max-width: 860px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { position: static; height: auto; border-right: none; border-bottom: 1px solid var(--border); }
}

.sidebar {
  position: sticky; top: 60px; height: calc(100vh - 60px);
  overflow-y: auto; background: var(--surface); border-right: 1px solid var(--border);
  padding: 28px 0; display: flex; flex-direction: column;
}
.sidebar::-webkit-scrollbar { width: 3px; }
.sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

.entity-card { padding: 0 20px 24px; border-bottom: 1px solid var(--border); margin-bottom: 8px; }
.entity-nombre { font-family: var(--font-display); font-size: 1.6rem; font-weight: 800; line-height: 1.1; margin-bottom: 4px; }
.entity-sub { color: var(--orange); font-size: 0.88rem; font-weight: 500; margin-bottom: 12px; }
.entity-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.entity-chip { background: var(--surface2); border: 1px solid var(--border); border-radius: 16px; padding: 4px 10px; font-size: 0.75rem; color: var(--muted); }

.nav-label { padding: 16px 20px 8px; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); }
.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 20px; cursor: pointer; border-left: 3px solid transparent;
  transition: all 0.15s ease; text-decoration: none; color: var(--muted);
}
.nav-item:hover { background: var(--surface2); color: var(--text); }
.nav-item.active { background: var(--orange-glow); border-left-color: var(--orange); color: var(--text); }
.nav-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; background: var(--surface2); transition: background 0.15s; flex-shrink: 0; }
.nav-item.active .nav-icon { background: var(--orange-glow); }
.nav-text { flex: 1; }
.nav-title { font-size: 1rem; font-weight: 500; display: block; line-height: 1.2; }
.nav-sub { font-size: 0.72rem; color: var(--muted); display: block; margin-top: 1px; }
.nav-item.active .nav-sub { color: var(--orange); opacity: 0.8; }
.nav-status { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; flex-shrink: 0; transition: all 0.2s; }
.nav-status.done { background: var(--green); border-color: var(--green); color: #fff; font-size: 0.65rem; }
.nav-status.partial { background: var(--yellow); border-color: var(--yellow); color: #fff; }

.main { padding: 40px 52px 100px; max-width: 860px; }
@media (max-width: 860px) { .main { padding: 28px 20px 80px; } }

.success-banner { display: none; background: var(--green-bg); border: 1.5px solid var(--green); border-radius: 20px; padding: 48px 40px; text-align: center; margin-bottom: 40px; }
.success-banner .check { font-size: 3.5rem; margin-bottom: 16px; }
.success-banner h3 { font-family: var(--font-display); color: var(--green); font-size: 1.6rem; margin-bottom: 8px; }
.success-banner p { color: var(--muted); font-size: 1.05rem; line-height: 1.6; }

.form-section { margin-bottom: 48px; scroll-margin-top: 80px; opacity: 0; transform: translateY(20px); animation: fadeUp 0.45s ease forwards; }
.form-section:nth-child(1){animation-delay:.05s}
.form-section:nth-child(2){animation-delay:.1s}
.form-section:nth-child(3){animation-delay:.15s}
.form-section:nth-child(4){animation-delay:.2s}
.form-section:nth-child(5){animation-delay:.25s}
@keyframes fadeUp { to { opacity:1; transform:translateY(0); } }
.form-section.highlight .section-card { border-color: var(--orange); box-shadow: 0 0 0 3px var(--orange-glow); }

.section-head { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
.section-icon-lg { width: 44px; height: 44px; border-radius: 12px; background: var(--orange-glow); color: var(--orange); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
.section-title { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; margin-bottom: 4px; }
.section-desc { font-size: 0.95rem; color: var(--muted); line-height: 1.5; }
.section-card { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 28px; transition: border-color 0.3s, box-shadow 0.3s; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
@media (max-width: 600px) { .grid-2, .grid-3 { grid-template-columns: 1fr; } }

.field { margin-bottom: 20px; }
.field:last-child { margin-bottom: 0; }
.field label { display: block; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--muted); margin-bottom: 8px; }
.field input, .field textarea {
  width: 100%; background: var(--surface2); border: 1.5px solid var(--border);
  border-radius: 11px; padding: 13px 16px; color: var(--text);
  font-size: 1.05rem; font-family: var(--font-body); outline: none;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}
.field input:focus, .field textarea:focus { border-color: var(--orange); background: #ff6b350a; box-shadow: 0 0 0 3px var(--orange-glow); }
.field input.error { border-color: var(--red); background: var(--red-bg); }
.field textarea { resize: vertical; min-height: 110px; line-height: 1.6; }
.field input::placeholder, .field textarea::placeholder { color: #2a2a50; }
.field-note { font-size: 0.8rem; color: var(--muted); margin-top: 8px; line-height: 1.5; }
.field-error { font-size: 0.78rem; color: var(--red); margin-top: 5px; display: none; }
.field-error.show { display: block; }

.pair-block { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 18px; margin-bottom: 12px; }
.pair-num { font-size: 0.72rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
.pair-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 600px) { .pair-fields { grid-template-columns: 1fr; } }

.img-preview { margin-top: 10px; border-radius: 8px; max-height: 60px; max-width: 100px; object-fit: contain; display: none; border: 1px solid var(--border); background: var(--surface2); padding: 4px; }

.festival-nuevo { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 12px; position: relative; }
.festival-nuevo-num { font-size: 0.72rem; font-weight: 700; color: var(--orange); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
.btn-remove { position: absolute; top: 14px; right: 14px; background: transparent; border: 1px solid var(--border); color: var(--muted); border-radius: 6px; width: 26px; height: 26px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.btn-remove:hover { border-color: #ff4444; color: #ff4444; }
.btn-add { width: 100%; background: transparent; border: 1.5px dashed var(--border); color: var(--muted); border-radius: 11px; padding: 14px; font-size: 0.92rem; font-family: var(--font-body); cursor: pointer; transition: all 0.15s; }
.btn-add:hover { border-color: var(--orange); color: var(--orange); }

.sidebar-fests { padding: 16px 20px; border-top: 1px solid var(--border); margin-top: auto; }
.sidebar-fests-title { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); margin-bottom: 12px; }
.fest-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); }
.fest-item:last-child { border-bottom: none; }
.fest-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--orange); margin-top: 7px; flex-shrink: 0; }
.fest-item strong { display: block; font-size: 0.85rem; font-weight: 500; line-height: 1.3; }
.fest-item span { font-size: 0.75rem; color: var(--muted); }
.empty { font-size: 0.82rem; color: var(--muted); font-style: italic; }

.save-bar { position: sticky; bottom: 0; background: linear-gradient(to top, var(--bg) 60%, transparent); padding: 28px 0 0; margin-top: 8px; }
.btn-submit { width: 100%; background: var(--orange); color: #fff; border: none; border-radius: 13px; padding: 18px; font-size: 1.05rem; font-weight: 700; font-family: var(--font-display); cursor: pointer; transition: background 0.2s, transform 0.1s; letter-spacing: 0.3px; }
.btn-submit:hover { background: #e55a25; }
.btn-submit:active { transform: scale(0.99); }
.btn-submit:disabled { background: #2a2a40; color: var(--muted); cursor: not-allowed; }
`;

const SHARED_HEAD = (title) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — FestQuest</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<style>${SHARED_CSS}</style>
</head>
<body>`;

// ── MUNICIPIO: GET formulario ──────────────────────────────────────────────
router.get('/municipio/:slug/editar', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('<h2>Token requerido</h2>');

  try {
    const { rows } = await pool.query(
      `SELECT m.*, (SELECT json_agg(q) FROM (
          SELECT f.id, f.nombre, f.fecha_inicio, f.fecha_fin
          FROM festivals f WHERE f.municipio_id = m.id
          ORDER BY f.fecha_inicio ASC NULLS LAST
        ) q) AS festivales
       FROM municipalities m WHERE m.token_edicion = $1`, [token]
    );
    if (!rows.length) return res.status(404).send(htmlError('Token inválido o municipio no encontrado'));
    const m = rows[0];

    const festivales = m.festivales || [];
    const festivalesHTML = festivales.length
      ? festivales.map(f => {
          const ini = f.fecha_inicio ? new Date(f.fecha_inicio).toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric'}) : '';
          const fin = f.fecha_fin ? new Date(f.fecha_fin).toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric'}) : '';
          return `<div class="fest-item"><span class="fest-dot"></span><div><strong>${f.nombre}</strong>${ini?`<span>${ini}${fin?' – '+fin:''}</span>`:''}</div></div>`;
        }).join('')
      : '<p class="empty">Sin festivales registrados aún</p>';

    const secStatus = {
      general:  ok(m.gentilicio) || ok(m.descripcion) || ok(m.codigo_dane),
      alcalde:  ok(m.alcalde) && ok(m.correo_alcalde),
      sitios:   ok(m.sitio_1),
      hoteles:  ok(m.hotel_1),
    };

    const banderaPreviewUrl = ok(m.bandera_url)
      ? (m.bandera_url.startsWith('http') ? m.bandera_url : `https://festquest-backend.onrender.com/${m.bandera_url}`)
      : '';

    res.send(`${SHARED_HEAD(`${m.nombre} — Formulario municipio`)}

<div class="topbar">
  <div class="topbar-left">
    <div class="logo">FestQuest</div>
    <div class="crumb">/ <strong>${m.nombre}</strong> / Portal municipio</div>
  </div>
  <div class="topbar-right">
    <div class="progress-pill">Perfil <span class="pct" id="topPct">0%</span> completo</div>
  </div>
</div>

<div class="layout">
  <aside class="sidebar">
    <div class="entity-card">
      <div class="entity-nombre">${m.nombre}</div>
      <div class="entity-sub">${m.departamento}${m.subregion?' · '+m.subregion:''}</div>
      <div class="entity-chips">
        ${ok(m.habitantes)?`<div class="entity-chip">👥 ${Number(m.habitantes).toLocaleString('es-CO')}</div>`:''}
        ${ok(m.altura)?`<div class="entity-chip">⛰️ ${m.altura}m</div>`:''}
        ${ok(m.temperatura_promedio)?`<div class="entity-chip">🌡️ ${m.temperatura_promedio}°C</div>`:''}
        ${!ok(m.habitantes)&&!ok(m.altura)&&!ok(m.temperatura_promedio)?'<div class="entity-chip">Sin datos aún</div>':''}
      </div>
    </div>

    <div class="nav-label">Secciones del formulario</div>

    <a class="nav-item active" data-section="sec-general" onclick="goTo('sec-general',this)">
      <div class="nav-icon">🏙️</div>
      <div class="nav-text"><span class="nav-title">Datos generales</span><span class="nav-sub">Gentilicio, DANE, descripción</span></div>
      <div class="nav-status ${secStatus.general?'done':''}" id="ns-general">${secStatus.general?'✓':''}</div>
    </a>
    <a class="nav-item" data-section="sec-alcalde" onclick="goTo('sec-alcalde',this)">
      <div class="nav-icon">👤</div>
      <div class="nav-text"><span class="nav-title">Autoridad municipal</span><span class="nav-sub">Alcalde/sa, correo</span></div>
      <div class="nav-status ${secStatus.alcalde?'done':''}" id="ns-alcalde">${secStatus.alcalde?'✓':''}</div>
    </a>
    <a class="nav-item" data-section="sec-sitios" onclick="goTo('sec-sitios',this)">
      <div class="nav-icon">📍</div>
      <div class="nav-text"><span class="nav-title">Sitios turísticos</span><span class="nav-sub">Hasta 3 con enlace a Maps</span></div>
      <div class="nav-status ${secStatus.sitios?'done':''}" id="ns-sitios">${secStatus.sitios?'✓':''}</div>
    </a>
    <a class="nav-item" data-section="sec-hoteles" onclick="goTo('sec-hoteles',this)">
      <div class="nav-icon">🏨</div>
      <div class="nav-text"><span class="nav-title">Alojamiento</span><span class="nav-sub">Hoteles con WhatsApp</span></div>
      <div class="nav-status ${secStatus.hoteles?'done':''}" id="ns-hoteles">${secStatus.hoteles?'✓':''}</div>
    </a>
    <a class="nav-item" data-section="sec-festivales" onclick="goTo('sec-festivales',this)">
      <div class="nav-icon">🎉</div>
      <div class="nav-text"><span class="nav-title">Proponer festivales</span><span class="nav-sub">Agregar festivales faltantes</span></div>
      <div class="nav-status" id="ns-festivales"></div>
    </a>

    <div class="sidebar-fests">
      <div class="sidebar-fests-title">📅 Festivales en FestQuest</div>
      ${festivalesHTML}
    </div>
  </aside>

  <main class="main">
    <div id="success" class="success-banner">
      <div class="check">✅</div>
      <h3>¡Información guardada!</h3>
      <p>Los datos de <strong>${m.nombre}</strong> ya están actualizados en FestQuest.<br>Gracias por completar el perfil de su municipio.</p>
    </div>

    <form id="mainForm">
      <input type="hidden" name="token" value="${token}">
      <input type="hidden" name="municipio_id" value="${m.id}">

      <!-- DATOS GENERALES -->
      <div class="form-section" id="sec-general">
        <div class="section-head">
          <div class="section-icon-lg">🏙️</div>
          <div><div class="section-title">Datos generales</div><div class="section-desc">Información básica del municipio visible en FestQuest.</div></div>
        </div>
        <div class="section-card">
          <div class="grid-3">
            <div class="field">
              <label>Gentilicio</label>
              <input type="text" name="gentilicio" placeholder="Ej: Guatapeño/a" value="${v(m.gentilicio)}">
            </div>
            <div class="field">
              <label>Habitantes</label>
              <input type="number" name="habitantes" placeholder="Ej: 12000" value="${v(m.habitantes)}">
            </div>
            <div class="field">
              <label>Subregión</label>
              <input type="text" name="subregion" placeholder="Ej: Oriente" value="${v(m.subregion)}">
            </div>
          </div>
          <div class="grid-3">
            <div class="field">
              <label>Altura (m.s.n.m)</label>
              <input type="number" name="altura" placeholder="Ej: 1900" value="${v(m.altura)}">
            </div>
            <div class="field">
              <label>Temperatura prom. (°C)</label>
              <input type="number" step="0.1" name="temperatura_promedio" placeholder="Ej: 22" value="${v(m.temperatura_promedio)}">
            </div>
            <div class="field">
              <label>Código DANE</label>
              <input type="text" name="codigo_dane" placeholder="Ej: 05001" value="${v(m.codigo_dane)}">
            </div>
          </div>
          <div class="field">
            <label>URL de la bandera</label>
            <input type="text" name="bandera_url" id="banderaUrl" placeholder="https://... o ruta relativa" value="${v(m.bandera_url)}" oninput="previewBandera(this.value)">
            <div class="field-note">Si la URL es relativa (ej: 05001.jpg), se construirá como festquest-backend.onrender.com/05001.jpg</div>
            <img id="banderaPreview" class="img-preview" src="${banderaPreviewUrl}" ${banderaPreviewUrl?'style="display:block"':''} alt="Preview bandera" onerror="this.style.display='none'">
          </div>
          <div class="field">
            <label>Descripción del municipio</label>
            <textarea name="descripcion" placeholder="Historia, cultura, gastronomía, atractivos naturales...">${v(m.descripcion)}</textarea>
            <div class="field-note">Este texto aparece cuando alguien explora el municipio en FestQuest.</div>
          </div>
        </div>
      </div>

      <!-- ALCALDE -->
      <div class="form-section" id="sec-alcalde">
        <div class="section-head">
          <div class="section-icon-lg">👤</div>
          <div><div class="section-title">Autoridad municipal</div><div class="section-desc">Contacto oficial de la alcaldía para visitantes.</div></div>
        </div>
        <div class="section-card">
          <div class="field">
            <label>Nombre completo del alcalde/sa</label>
            <input type="text" name="alcalde" placeholder="Ej: María García Rodríguez" value="${v(m.alcalde)}">
          </div>
          <div class="grid-2">
            <div class="field">
              <label>Correo electrónico oficial</label>
              <input type="email" name="correo_alcalde" placeholder="alcaldia@municipio.gov.co" value="${v(m.correo_alcalde)}">
            </div>
            <div class="field">
              <label>Teléfono / WhatsApp</label>
              <input type="tel" name="telefono" placeholder="+57 300 000 0000" value="${v(m.telefono)}">
            </div>
          </div>
        </div>
      </div>

      <!-- SITIOS TURÍSTICOS -->
      <div class="form-section" id="sec-sitios">
        <div class="section-head">
          <div class="section-icon-lg">📍</div>
          <div><div class="section-title">Sitios turísticos</div><div class="section-desc">Hasta 3 atractivos principales con enlace a Google Maps.</div></div>
        </div>
        <div class="section-card">
          ${[[1, v(m.sitio_1), v(m.maps_1)],[2, v(m.sitio_2), v(m.maps_2)],[3, v(m.sitio_3), v(m.maps_3)]].map(([n,s,mp]) => `
          <div class="pair-block">
            <div class="pair-num">Sitio ${n}${n===1?' (principal)':' (opcional)'}</div>
            <div class="pair-fields">
              <div class="field" style="margin:0">
                <label>Nombre del sitio</label>
                <input type="text" name="sitio_${n}" placeholder="${n===1?'Ej: Parque principal':'Opcional'}" value="${s}">
              </div>
              <div class="field" style="margin:0">
                <label>Enlace Google Maps</label>
                <input type="url" name="maps_${n}" placeholder="https://maps.google.com/..." value="${mp}" data-type="url">
                <div class="field-error" id="err-maps_${n}">URL inválida</div>
              </div>
            </div>
          </div>`).join('')}
          <div class="field-note">Parques, iglesias, ríos, cascadas, museos, miradores, reservas naturales, etc.</div>
        </div>
      </div>

      <!-- ALOJAMIENTO -->
      <div class="form-section" id="sec-hoteles">
        <div class="section-head">
          <div class="section-icon-lg">🏨</div>
          <div><div class="section-title">Alojamiento</div><div class="section-desc">Hoteles y hospedajes recomendados con contacto directo por WhatsApp.</div></div>
        </div>
        <div class="section-card">
          ${[[1, v(m.hotel_1), v(m.wa_1)],[2, v(m.hotel_2), v(m.wa_2)],[3, v(m.hotel_3), v(m.wa_3)]].map(([n,h,w]) => `
          <div class="pair-block">
            <div class="pair-num">Hotel / Hospedaje ${n}${n===1?'':' (opcional)'}</div>
            <div class="pair-fields">
              <div class="field" style="margin:0">
                <label>Nombre del establecimiento</label>
                <input type="text" name="hotel_${n}" placeholder="${n===1?'Ej: Hotel Boutique':'Opcional'}" value="${h}">
              </div>
              <div class="field" style="margin:0">
                <label>WhatsApp (https://wa.me/57…)</label>
                <input type="url" name="wa_${n}" placeholder="https://wa.me/573001234567" value="${w}" data-type="wa">
                <div class="field-error" id="err-wa_${n}">Debe ser https://wa.me/...</div>
              </div>
            </div>
          </div>`).join('')}
          <div class="field-note">El contacto_hoteles legacy también se actualizará automáticamente.</div>
        </div>
      </div>

      <!-- FESTIVALES NUEVOS -->
      <div class="form-section" id="sec-festivales">
        <div class="section-head">
          <div class="section-icon-lg">🎉</div>
          <div><div class="section-title">Proponer festivales</div><div class="section-desc">¿Hay festivales que no aparecen en FestQuest? Agréguelos para verificación.</div></div>
        </div>
        <div class="section-card">
          <div id="festivalesNuevos"></div>
          <button type="button" class="btn-add" onclick="agregarFestival()">+ Agregar festival</button>
        </div>
      </div>

      <div class="save-bar">
        <button type="submit" class="btn-submit" id="btnEnviar">Guardar información del municipio</button>
      </div>
    </form>
  </main>
</div>

<script>
function goTo(sectionId, navEl) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  const section = document.getElementById(sectionId);
  if (section) { section.scrollIntoView({ behavior: 'smooth', block: 'start' }); section.classList.add('highlight'); setTimeout(() => section.classList.remove('highlight'), 1500); }
}

const sections = ['sec-general','sec-alcalde','sec-sitios','sec-hoteles','sec-festivales'];
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.section === entry.target.id));
    }
  });
}, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });
sections.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });

const progressFields = [
  { fields: ['gentilicio','descripcion','codigo_dane'], ns: 'ns-general' },
  { fields: ['alcalde','correo_alcalde'], ns: 'ns-alcalde' },
  { fields: ['sitio_1'], ns: 'ns-sitios' },
  { fields: ['hotel_1'], ns: 'ns-hoteles' },
];
function calcProgress() {
  let done = 0;
  progressFields.forEach(({ fields, ns }) => {
    const filled = fields.some(n => { const el = document.querySelector('[name="'+n+'"]'); return el && el.value.trim() !== ''; });
    const statusEl = document.getElementById(ns);
    if (statusEl) { statusEl.classList.toggle('done', filled); statusEl.textContent = filled ? '✓' : ''; }
    if (filled) done++;
  });
  const pct = Math.round((done / progressFields.length) * 100);
  const topPct = document.getElementById('topPct');
  if (topPct) topPct.textContent = pct + '%';
}
document.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', calcProgress));
calcProgress();

function previewBandera(val) {
  const preview = document.getElementById('banderaPreview');
  if (!val.trim()) { preview.style.display = 'none'; return; }
  const url = val.startsWith('http') ? val : 'https://festquest-backend.onrender.com/' + val.replace(/^\\//, '');
  preview.src = url; preview.style.display = 'block';
  preview.onerror = () => preview.style.display = 'none';
}

function isValidUrl(s) { if (!s) return true; try { new URL(s); return true; } catch { return false; } }
function isValidWa(s) { if (!s) return true; return /^https?:\\/\\/wa\\.me\\//.test(s); }

function validateUrls() {
  let valid = true;
  document.querySelectorAll('[data-type="url"]').forEach(input => {
    const name = input.name;
    const errEl = document.getElementById('err-' + name);
    const bad = !isValidUrl(input.value.trim());
    input.classList.toggle('error', bad);
    if (errEl) errEl.classList.toggle('show', bad);
    if (bad) valid = false;
  });
  document.querySelectorAll('[data-type="wa"]').forEach(input => {
    const name = input.name;
    const errEl = document.getElementById('err-' + name);
    const bad = !isValidWa(input.value.trim());
    input.classList.toggle('error', bad);
    if (errEl) errEl.classList.toggle('show', bad);
    if (bad) valid = false;
  });
  return valid;
}

let festivalCount = 0;
function agregarFestival() {
  const container = document.getElementById('festivalesNuevos');
  const idx = festivalCount++;
  const div = document.createElement('div');
  div.className = 'festival-nuevo'; div.id = 'festival_' + idx;
  div.innerHTML = \`
    <button type="button" class="btn-remove" onclick="document.getElementById('festival_\${idx}').remove()">✕</button>
    <div class="festival-nuevo-num">Festival propuesto \${idx + 1}</div>
    <div class="field"><label>Nombre del festival</label><input type="text" name="fest_nombre_\${idx}" placeholder="Ej: Festival del Folclor"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="field"><label>Fecha inicio</label><input type="date" name="fest_inicio_\${idx}"></div>
      <div class="field"><label>Fecha fin</label><input type="date" name="fest_fin_\${idx}"></div>
    </div>
    <div class="field"><label>Descripción breve (opcional)</label><input type="text" name="fest_desc_\${idx}" placeholder="Tipo de festival, tradición, año de fundación..."></div>
  \`;
  container.appendChild(div); div.querySelector('input').focus();
  const ns = document.getElementById('ns-festivales');
  if (ns) { ns.classList.add('partial'); ns.textContent = '•'; }
}

document.getElementById('mainForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!validateUrls()) { alert('Corrija los errores de URL antes de guardar.'); return; }
  const btn = document.getElementById('btnEnviar');
  btn.disabled = true; btn.textContent = 'Guardando...';
  const fd = new FormData(this);
  const data = Object.fromEntries(fd.entries());

  const festivalesNuevos = [];
  for (let i = 0; i < festivalCount; i++) {
    if (!document.getElementById('festival_'+i)) continue;
    const nombre = (data['fest_nombre_'+i]||'').trim();
    if (!nombre) continue;
    festivalesNuevos.push({ nombre, fecha_inicio: data['fest_inicio_'+i]||null, fecha_fin: data['fest_fin_'+i]||null, descripcion: data['fest_desc_'+i]||null });
  }

  const payload = {
    token: data.token,
    alcalde: data.alcalde||null, correo_alcalde: data.correo_alcalde||null, telefono: data.telefono||null,
    descripcion: data.descripcion||null, gentilicio: data.gentilicio||null,
    habitantes: data.habitantes||null, altura: data.altura||null,
    temperatura_promedio: data.temperatura_promedio||null, subregion: data.subregion||null,
    codigo_dane: data.codigo_dane||null, bandera_url: data.bandera_url||null,
    sitio_1: data.sitio_1||null, maps_1: data.maps_1||null,
    sitio_2: data.sitio_2||null, maps_2: data.maps_2||null,
    sitio_3: data.sitio_3||null, maps_3: data.maps_3||null,
    hotel_1: data.hotel_1||null, wa_1: data.wa_1||null,
    hotel_2: data.hotel_2||null, wa_2: data.wa_2||null,
    hotel_3: data.hotel_3||null, wa_3: data.wa_3||null,
    festivales_nuevos: festivalesNuevos,
  };

  try {
    const res = await fetch('/api/municipio/'+data.municipio_id+'/actualizar', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.ok) {
      document.getElementById('success').style.display = 'block';
      document.getElementById('mainForm').style.display = 'none';
      window.scrollTo({top:0,behavior:'smooth'});
    } else throw new Error(json.error||'Error desconocido');
  } catch(err) {
    btn.disabled = false; btn.textContent = 'Guardar información del municipio';
    alert('Error al guardar: ' + err.message);
  }
});
</script>
</body></html>`);

  } catch (err) {
    console.error('Error en formulario municipio:', err);
    res.status(500).send(htmlError('Error interno del servidor'));
  }
});

// ── MUNICIPIO: POST actualizar ─────────────────────────────────────────────
router.post('/api/municipio/:id/actualizar', async (req, res) => {
  const { id } = req.params;
  const {
    token, alcalde, correo_alcalde, telefono, descripcion, gentilicio,
    habitantes, altura, temperatura_promedio, subregion,
    codigo_dane, bandera_url,
    sitio_1, maps_1, sitio_2, maps_2, sitio_3, maps_3,
    hotel_1, wa_1, hotel_2, wa_2, hotel_3, wa_3,
    festivales_nuevos,
  } = req.body;

  if (!token) return res.status(400).json({ ok: false, error: 'Token requerido' });

  // Validate URLs
  for (const [key, val] of [[maps_1,maps_1],[maps_2,maps_2],[maps_3,maps_3],[wa_1,wa_1],[wa_2,wa_2],[wa_3,wa_3]]) {
    if (val && !isUrl(val)) return res.status(400).json({ ok:false, error:`URL inválida: ${key}` });
  }
  for (const val of [wa_1,wa_2,wa_3]) {
    if (val && !isWa(val)) return res.status(400).json({ ok:false, error:'wa debe ser https://wa.me/...' });
  }

  try {
    const { rows } = await pool.query('SELECT id FROM municipalities WHERE id=$1 AND token_edicion=$2', [id, token]);
    if (!rows.length) return res.status(403).json({ ok:false, error:'Token inválido' });

    // Build legacy pipe-sep for backward compat
    const sitios_turisticos = [sitio_1,sitio_2,sitio_3].filter(Boolean).join('|') || null;
    const hoteles           = [hotel_1,hotel_2,hotel_3].filter(Boolean).join('|') || null;
    const contacto_hoteles  = [wa_1,wa_2,wa_3].filter(Boolean).join('|') || null;

    await pool.query(
      `UPDATE municipalities SET
        alcalde               = COALESCE($1,  alcalde),
        correo_alcalde        = COALESCE($2,  correo_alcalde),
        telefono              = COALESCE($3,  telefono),
        descripcion           = COALESCE($4,  descripcion),
        gentilicio            = COALESCE($5,  gentilicio),
        habitantes            = COALESCE($6::integer, habitantes),
        altura                = COALESCE($7::integer, altura),
        temperatura_promedio  = COALESCE($8::numeric, temperatura_promedio),
        subregion             = COALESCE($9,  subregion),
        codigo_dane           = COALESCE($10, codigo_dane),
        bandera_url           = COALESCE($11, bandera_url),
        sitio_1               = COALESCE($12, sitio_1),
        maps_1                = COALESCE($13, maps_1),
        sitio_2               = COALESCE($14, sitio_2),
        maps_2                = COALESCE($15, maps_2),
        sitio_3               = COALESCE($16, sitio_3),
        maps_3                = COALESCE($17, maps_3),
        hotel_1               = COALESCE($18, hotel_1),
        wa_1                  = COALESCE($19, wa_1),
        hotel_2               = COALESCE($20, hotel_2),
        wa_2                  = COALESCE($21, wa_2),
        hotel_3               = COALESCE($22, hotel_3),
        wa_3                  = COALESCE($23, wa_3),
        sitios_turisticos     = COALESCE($24, sitios_turisticos),
        hoteles               = COALESCE($25, hoteles),
        contacto_hoteles      = COALESCE($26, contacto_hoteles),
        fecha_actualizacion   = NOW()
       WHERE id = $27`,
      [
        alcalde, correo_alcalde, telefono, descripcion, gentilicio,
        habitantes||null, altura||null, temperatura_promedio||null, subregion,
        codigo_dane, bandera_url,
        sitio_1, maps_1, sitio_2, maps_2, sitio_3, maps_3,
        hotel_1, wa_1, hotel_2, wa_2, hotel_3, wa_3,
        sitios_turisticos, hoteles, contacto_hoteles,
        id,
      ]
    );

    if (festivales_nuevos?.length) {
      for (const f of festivales_nuevos) {
        if (!f.nombre) continue;
        await pool.query(
          'INSERT INTO festivals (nombre,municipio_id,fecha_inicio,fecha_fin,descripcion) VALUES ($1,$2,$3::date,$4::date,$5)',
          [f.nombre, id, f.fecha_inicio||null, f.fecha_fin||null, f.descripcion||null]
        ).catch(() => {});
      }
    }

    res.json({ ok: true });
  } catch(err) {
    console.error('Error actualizando municipio:', err);
    res.status(500).json({ ok:false, error: 'Error interno' });
  }
});

// ── FESTIVAL: GET formulario ───────────────────────────────────────────────
router.get('/festival/:id/editar', async (req, res) => {
  const { admintoken } = req.query;
  if (!admintoken || admintoken !== process.env.ADMIN_TOKEN) {
    return res.status(403).send(htmlError('Acceso no autorizado'));
  }

  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).send(htmlError('ID inválido'));

    const { rows } = await pool.query(
      `SELECT f.*, m.nombre AS muni_nombre, m.departamento AS muni_dpto, m.subregion AS muni_sub
       FROM festivals f
       LEFT JOIN municipalities m ON f.municipio_id = m.id
       WHERE f.id = $1`, [id]
    );
    if (!rows.length) return res.status(404).send(htmlError('Festival no encontrado'));
    const f = rows[0];

    const formatDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
    const muniLabel = [f.muni_nombre, f.muni_dpto, f.muni_sub].filter(Boolean).join(' · ');

    const secStatus = {
      general:  ok(f.descripcion),
      contacto: ok(f.maps_link) || ok(f.lugar_encuentro),
      sitios:   ok(f.sitio_1),
      hoteles:  ok(f.hotel_1),
    };

    res.send(`${SHARED_HEAD(`${f.nombre} — Formulario festival`)}

<div class="topbar">
  <div class="topbar-left">
    <div class="logo">FestQuest</div>
    <div class="crumb">/ <strong>${f.nombre}</strong> / Admin festival</div>
  </div>
  <div class="topbar-right">
    <div class="progress-pill">Perfil <span class="pct" id="topPct">0%</span> completo</div>
  </div>
</div>

<div class="layout">
  <aside class="sidebar">
    <div class="entity-card">
      <div class="entity-nombre">${f.nombre}</div>
      <div class="entity-sub">${muniLabel||'Sin municipio'}</div>
      <div class="entity-chips">
        ${f.fecha_inicio?`<div class="entity-chip">📅 ${formatDate(f.fecha_inicio)}</div>`:'<div class="entity-chip">Sin fecha</div>'}
        ${f.is_active?'<div class="entity-chip" style="color:var(--green)">Activo</div>':'<div class="entity-chip">Inactivo</div>'}
        <div class="entity-chip">ID ${f.id}</div>
      </div>
    </div>

    <div class="nav-label">Secciones del formulario</div>

    <a class="nav-item active" data-section="sec-general" onclick="goTo('sec-general',this)">
      <div class="nav-icon">🎊</div>
      <div class="nav-text"><span class="nav-title">Datos del festival</span><span class="nav-sub">Fechas, descripción</span></div>
      <div class="nav-status ${secStatus.general?'done':''}" id="ns-general">${secStatus.general?'✓':''}</div>
    </a>
    <a class="nav-item" data-section="sec-contacto" onclick="goTo('sec-contacto',this)">
      <div class="nav-icon">📍</div>
      <div class="nav-text"><span class="nav-title">Lugar y contacto</span><span class="nav-sub">Venue, Maps, WhatsApp</span></div>
      <div class="nav-status ${secStatus.contacto?'done':''}" id="ns-contacto">${secStatus.contacto?'✓':''}</div>
    </a>
    <a class="nav-item" data-section="sec-sitios" onclick="goTo('sec-sitios',this)">
      <div class="nav-icon">🗺️</div>
      <div class="nav-text"><span class="nav-title">Sitios recomendados</span><span class="nav-sub">Hasta 3 con Maps</span></div>
      <div class="nav-status ${secStatus.sitios?'done':''}" id="ns-sitios">${secStatus.sitios?'✓':''}</div>
    </a>
    <a class="nav-item" data-section="sec-hoteles" onclick="goTo('sec-hoteles',this)">
      <div class="nav-icon">🏨</div>
      <div class="nav-text"><span class="nav-title">Hospedaje</span><span class="nav-sub">Hoteles con WhatsApp</span></div>
      <div class="nav-status ${secStatus.hoteles?'done':''}" id="ns-hoteles">${secStatus.hoteles?'✓':''}</div>
    </a>
  </aside>

  <main class="main">
    <div id="success" class="success-banner">
      <div class="check">✅</div>
      <h3>¡Festival actualizado!</h3>
      <p>Los datos de <strong>${f.nombre}</strong> ya están guardados en FestQuest.</p>
    </div>

    <form id="mainForm">
      <input type="hidden" name="festival_id" value="${f.id}">
      <input type="hidden" name="admintoken" value="${admintoken}">

      <!-- DATOS DEL FESTIVAL -->
      <div class="form-section" id="sec-general">
        <div class="section-head">
          <div class="section-icon-lg">🎊</div>
          <div><div class="section-title">Datos del festival</div><div class="section-desc">Información principal del evento.</div></div>
        </div>
        <div class="section-card">
          <div class="field">
            <label>Nombre del festival</label>
            <input type="text" name="nombre" value="${v(f.nombre)}" placeholder="Nombre oficial del festival">
          </div>
          <div class="grid-2">
            <div class="field">
              <label>Fecha de inicio</label>
              <input type="date" name="fecha_inicio" value="${formatDate(f.fecha_inicio)}">
            </div>
            <div class="field">
              <label>Fecha de fin</label>
              <input type="date" name="fecha_fin" value="${formatDate(f.fecha_fin)}">
            </div>
          </div>
          <div class="field">
            <label>Descripción del festival</label>
            <textarea name="descripcion" placeholder="Historia, tradición, programación, por qué vale la pena asistir...">${v(f.descripcion)}</textarea>
            <div class="field-note">Aparece en la pantalla de detalle del festival en la app.</div>
          </div>
        </div>
      </div>

      <!-- LUGAR Y CONTACTO -->
      <div class="form-section" id="sec-contacto">
        <div class="section-head">
          <div class="section-icon-lg">📍</div>
          <div><div class="section-title">Lugar y contacto</div><div class="section-desc">Venue del evento y canales de contacto para los asistentes.</div></div>
        </div>
        <div class="section-card">
          <div class="field">
            <label>Lugar / Venue del evento</label>
            <input type="text" name="lugar_encuentro" placeholder="Ej: Parque principal, Coliseo Municipal" value="${v(f.lugar_encuentro)}">
          </div>
          <div class="grid-2">
            <div class="field">
              <label>Enlace Google Maps</label>
              <input type="url" name="maps_link" placeholder="https://maps.google.com/..." value="${v(f.maps_link)}" data-type="url">
              <div class="field-error" id="err-maps_link">URL inválida</div>
            </div>
            <div class="field">
              <label>WhatsApp del organizador</label>
              <input type="url" name="whatsapp_link" placeholder="https://wa.me/573001234567" value="${v(f.whatsapp_link)}" data-type="wa">
              <div class="field-error" id="err-whatsapp_link">Debe ser https://wa.me/...</div>
            </div>
          </div>
        </div>
      </div>

      <!-- SITIOS RECOMENDADOS -->
      <div class="form-section" id="sec-sitios">
        <div class="section-head">
          <div class="section-icon-lg">🗺️</div>
          <div><div class="section-title">Sitios recomendados</div><div class="section-desc">Lugares que los asistentes al festival deben conocer en el municipio.</div></div>
        </div>
        <div class="section-card">
          ${[[1, v(f.sitio_1), v(f.maps_1)],[2, v(f.sitio_2), v(f.maps_2)],[3, v(f.sitio_3), v(f.maps_3)]].map(([n,s,mp]) => `
          <div class="pair-block">
            <div class="pair-num">Sitio ${n}${n===1?' (principal)':' (opcional)'}</div>
            <div class="pair-fields">
              <div class="field" style="margin:0">
                <label>Nombre del sitio</label>
                <input type="text" name="sitio_${n}" placeholder="${n===1?'Ej: Parque principal':'Opcional'}" value="${s}">
              </div>
              <div class="field" style="margin:0">
                <label>Enlace Google Maps</label>
                <input type="url" name="maps_${n}" placeholder="https://maps.google.com/..." value="${mp}" data-type="url">
                <div class="field-error" id="err-maps_${n}">URL inválida</div>
              </div>
            </div>
          </div>`).join('')}
          <div class="field-note">Parques, plazas, sitios de interés cultural o turístico cercanos al festival.</div>
        </div>
      </div>

      <!-- HOSPEDAJE -->
      <div class="form-section" id="sec-hoteles">
        <div class="section-head">
          <div class="section-icon-lg">🏨</div>
          <div><div class="section-title">Hospedaje</div><div class="section-desc">Hoteles y hospedajes recomendados para los asistentes al festival.</div></div>
        </div>
        <div class="section-card">
          ${[[1, v(f.hotel_1), v(f.wa_1)],[2, v(f.hotel_2), v(f.wa_2)],[3, v(f.hotel_3), v(f.wa_3)]].map(([n,h,w]) => `
          <div class="pair-block">
            <div class="pair-num">Hotel / Hospedaje ${n}${n===1?'':' (opcional)'}</div>
            <div class="pair-fields">
              <div class="field" style="margin:0">
                <label>Nombre del establecimiento</label>
                <input type="text" name="hotel_${n}" placeholder="${n===1?'Ej: Hotel Boutique':'Opcional'}" value="${h}">
              </div>
              <div class="field" style="margin:0">
                <label>WhatsApp (https://wa.me/57…)</label>
                <input type="url" name="wa_${n}" placeholder="https://wa.me/573001234567" value="${w}" data-type="wa">
                <div class="field-error" id="err-wa_${n}">Debe ser https://wa.me/...</div>
              </div>
            </div>
          </div>`).join('')}
        </div>
      </div>

      <div class="save-bar">
        <button type="submit" class="btn-submit" id="btnEnviar">Guardar información del festival</button>
      </div>
    </form>
  </main>
</div>

<script>
function goTo(sectionId, navEl) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  const section = document.getElementById(sectionId);
  if (section) { section.scrollIntoView({ behavior: 'smooth', block: 'start' }); section.classList.add('highlight'); setTimeout(() => section.classList.remove('highlight'), 1500); }
}

const sections = ['sec-general','sec-contacto','sec-sitios','sec-hoteles'];
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.section === entry.target.id));
    }
  });
}, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });
sections.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });

const progressFields = [
  { fields: ['descripcion'], ns: 'ns-general' },
  { fields: ['lugar_encuentro','maps_link'], ns: 'ns-contacto' },
  { fields: ['sitio_1'], ns: 'ns-sitios' },
  { fields: ['hotel_1'], ns: 'ns-hoteles' },
];
function calcProgress() {
  let done = 0;
  progressFields.forEach(({ fields, ns }) => {
    const filled = fields.some(n => { const el = document.querySelector('[name="'+n+'"]'); return el && el.value.trim() !== ''; });
    const statusEl = document.getElementById(ns);
    if (statusEl) { statusEl.classList.toggle('done', filled); statusEl.textContent = filled ? '✓' : ''; }
    if (filled) done++;
  });
  document.getElementById('topPct').textContent = Math.round((done / progressFields.length) * 100) + '%';
}
document.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', calcProgress));
calcProgress();

function isValidUrl(s) { if (!s) return true; try { new URL(s); return true; } catch { return false; } }
function isValidWa(s) { if (!s) return true; return /^https?:\\/\\/wa\\.me\\//.test(s); }

function validateUrls() {
  let valid = true;
  document.querySelectorAll('[data-type="url"]').forEach(input => {
    const errEl = document.getElementById('err-' + input.name);
    const bad = !isValidUrl(input.value.trim());
    input.classList.toggle('error', bad);
    if (errEl) errEl.classList.toggle('show', bad);
    if (bad) valid = false;
  });
  document.querySelectorAll('[data-type="wa"]').forEach(input => {
    const errEl = document.getElementById('err-' + input.name);
    const bad = !isValidWa(input.value.trim());
    input.classList.toggle('error', bad);
    if (errEl) errEl.classList.toggle('show', bad);
    if (bad) valid = false;
  });
  return valid;
}

document.getElementById('mainForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!validateUrls()) { alert('Corrija los errores de URL antes de guardar.'); return; }
  const btn = document.getElementById('btnEnviar');
  btn.disabled = true; btn.textContent = 'Guardando...';
  const fd = new FormData(this);
  const data = Object.fromEntries(fd.entries());
  const payload = {
    admintoken: data.admintoken, nombre: data.nombre||null,
    fecha_inicio: data.fecha_inicio||null, fecha_fin: data.fecha_fin||null,
    descripcion: data.descripcion||null, lugar_encuentro: data.lugar_encuentro||null,
    maps_link: data.maps_link||null, whatsapp_link: data.whatsapp_link||null,
    sitio_1: data.sitio_1||null, maps_1: data.maps_1||null,
    sitio_2: data.sitio_2||null, maps_2: data.maps_2||null,
    sitio_3: data.sitio_3||null, maps_3: data.maps_3||null,
    hotel_1: data.hotel_1||null, wa_1: data.wa_1||null,
    hotel_2: data.hotel_2||null, wa_2: data.wa_2||null,
    hotel_3: data.hotel_3||null, wa_3: data.wa_3||null,
  };
  try {
    const res = await fetch('/api/festival/'+data.festival_id+'/actualizar', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.ok) {
      document.getElementById('success').style.display = 'block';
      document.getElementById('mainForm').style.display = 'none';
      window.scrollTo({top:0,behavior:'smooth'});
    } else throw new Error(json.error||'Error desconocido');
  } catch(err) {
    btn.disabled = false; btn.textContent = 'Guardar información del festival';
    alert('Error al guardar: ' + err.message);
  }
});
</script>
</body></html>`);

  } catch (err) {
    console.error('Error en formulario festival:', err);
    res.status(500).send(htmlError('Error interno del servidor'));
  }
});

// ── FESTIVAL: POST actualizar ──────────────────────────────────────────────
router.post('/api/festival/:id/actualizar', async (req, res) => {
  const { id } = req.params;
  const {
    admintoken, nombre, fecha_inicio, fecha_fin, descripcion, lugar_encuentro,
    maps_link, whatsapp_link,
    sitio_1, maps_1, sitio_2, maps_2, sitio_3, maps_3,
    hotel_1, wa_1, hotel_2, wa_2, hotel_3, wa_3,
  } = req.body;

  if (!admintoken || admintoken !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ ok:false, error:'No autorizado' });
  }

  // Validate URLs
  for (const [key, val] of [['maps_link',maps_link],['whatsapp_link',whatsapp_link],['maps_1',maps_1],['maps_2',maps_2],['maps_3',maps_3],['wa_1',wa_1],['wa_2',wa_2],['wa_3',wa_3]]) {
    if (val && !isUrl(val)) return res.status(400).json({ ok:false, error:`URL inválida: ${key}` });
  }
  for (const val of [whatsapp_link, wa_1, wa_2, wa_3]) {
    if (val && !isWa(val)) return res.status(400).json({ ok:false, error:'wa/whatsapp debe ser https://wa.me/...' });
  }

  try {
    const festId = parseInt(id, 10);
    if (!Number.isFinite(festId)) return res.status(400).json({ ok:false, error:'ID inválido' });

    const { rowCount } = await pool.query(
      `UPDATE festivals SET
        nombre          = COALESCE($1,  nombre),
        fecha_inicio    = COALESCE($2::date, fecha_inicio),
        fecha_fin       = COALESCE($3::date, fecha_fin),
        descripcion     = COALESCE($4,  descripcion),
        lugar_encuentro = COALESCE($5,  lugar_encuentro),
        maps_link       = COALESCE($6,  maps_link),
        whatsapp_link   = COALESCE($7,  whatsapp_link),
        sitio_1         = COALESCE($8,  sitio_1),
        maps_1          = COALESCE($9,  maps_1),
        sitio_2         = COALESCE($10, sitio_2),
        maps_2          = COALESCE($11, maps_2),
        sitio_3         = COALESCE($12, sitio_3),
        maps_3          = COALESCE($13, maps_3),
        hotel_1         = COALESCE($14, hotel_1),
        wa_1            = COALESCE($15, wa_1),
        hotel_2         = COALESCE($16, hotel_2),
        wa_2            = COALESCE($17, wa_2),
        hotel_3         = COALESCE($18, hotel_3),
        wa_3            = COALESCE($19, wa_3)
       WHERE id = $20`,
      [
        nombre, fecha_inicio||null, fecha_fin||null, descripcion, lugar_encuentro,
        maps_link, whatsapp_link,
        sitio_1, maps_1, sitio_2, maps_2, sitio_3, maps_3,
        hotel_1, wa_1, hotel_2, wa_2, hotel_3, wa_3,
        festId,
      ]
    );

    if (!rowCount) return res.status(404).json({ ok:false, error:'Festival no encontrado' });
    res.json({ ok: true });
  } catch(err) {
    console.error('Error actualizando festival:', err);
    res.status(500).json({ ok:false, error:'Error interno' });
  }
});

// ── ADMIN: estado municipios ───────────────────────────────────────────────
router.get('/api/admin/municipios-estado', async (req, res) => {
  const { admintoken } = req.query;
  if (admintoken !== process.env.ADMIN_TOKEN) return res.status(403).json({ error:'No autorizado' });
  try {
    const { rows } = await pool.query(`
      SELECT m.id, m.nombre, m.departamento, m.token_edicion, m.fecha_actualizacion,
        (m.alcalde IS NOT NULL AND m.alcalde!='') AS tiene_alcalde,
        (m.sitio_1 IS NOT NULL AND m.sitio_1!='') AS tiene_sitios,
        (m.hotel_1 IS NOT NULL AND m.hotel_1!='') AS tiene_hoteles,
        (m.descripcion IS NOT NULL AND m.descripcion!='') AS tiene_descripcion,
        COUNT(f.id) AS num_festivales
      FROM municipalities m JOIN festivals f ON f.municipio_id=m.id
      WHERE m.token_edicion IS NOT NULL GROUP BY m.id
      ORDER BY m.fecha_actualizacion DESC NULLS LAST, num_festivales DESC
    `);
    res.json({ total:rows.length, completados:rows.filter(r=>r.tiene_alcalde&&r.tiene_sitios).length, municipios:rows });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// ── Helper ─────────────────────────────────────────────────────────────────
function htmlError(msg) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:sans-serif;background:#07070f;color:#eeeeff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}
    .box{background:#0d0d1c;border:1px solid #ff6b35;border-radius:16px;padding:32px;max-width:400px;text-align:center;}
    h2{color:#ff6b35;margin-bottom:12px;}p{color:#5a5a80;font-size:0.95rem;}
  </style></head><body><div class="box"><h2>FestQuest</h2><p>${msg}</p></div></body></html>`;
}

module.exports = router;
