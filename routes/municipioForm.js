const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function ok(val) { return val !== null && val !== undefined && val !== 'N/A' && String(val).trim() !== ''; }
function v(val) { return ok(val) ? String(val) : ''; }

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

    const sitios = m.sitios_turisticos ? m.sitios_turisticos.split('|') : ['','','','',''];
    while (sitios.length < 5) sitios.push('');
    const hoteles = m.hoteles ? m.hoteles.split('|') : ['','',''];
    const contactos = m.contacto_hoteles ? m.contacto_hoteles.split('|') : ['','',''];
    while (hoteles.length < 3) hoteles.push('');
    while (contactos.length < 3) contactos.push('');

    const festivales = m.festivales || [];
    const festivalesHTML = festivales.length
      ? festivales.map(f => {
          const ini = f.fecha_inicio ? new Date(f.fecha_inicio).toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric'}) : '';
          const fin = f.fecha_fin ? new Date(f.fecha_fin).toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric'}) : '';
          return `<div class="fest-item"><span class="fest-dot"></span><div><strong>${f.nombre}</strong>${ini?`<span>${ini}${fin?' – '+fin:''}</span>`:''}</div></div>`;
        }).join('')
      : '<p class="empty">Sin festivales registrados aún</p>';

    // Estado inicial de cada sección para el sidebar
    const secStatus = {
      general: ok(m.gentilicio) || ok(m.habitantes) || ok(m.descripcion),
      alcalde: ok(m.alcalde) && ok(m.correo_alcalde),
      sitios: ok(m.sitios_turisticos),
      hoteles: ok(m.hoteles),
      festivales: false
    };

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${m.nombre} — FestQuest</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<style>
:root {
  --orange: #ff6b35;
  --orange-glow: #ff6b3530;
  --bg: #07070f;
  --surface: #0d0d1c;
  --surface2: #13132a;
  --border: #1c1c38;
  --border-active: #ff6b35;
  --text: #eeeeff;
  --muted: #5a5a80;
  --green: #00d084;
  --green-bg: #00d08415;
  --yellow: #f59e0b;
  --font-body: 'DM Sans', sans-serif;
  --font-display: 'Syne', sans-serif;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; font-size: 16px; }
body { font-family: var(--font-body); background: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; }

/* TOPBAR */
.topbar {
  position: sticky; top: 0; z-index: 200;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px; height: 60px;
}
.topbar-left { display: flex; align-items: center; gap: 16px; }
.logo { font-family: var(--font-display); font-weight: 800; font-size: 1.3rem; color: var(--orange); letter-spacing: -0.5px; }
.muni-crumb { font-size: 0.9rem; color: var(--muted); }
.muni-crumb strong { color: var(--text); font-weight: 600; }
.topbar-right { display: flex; align-items: center; gap: 12px; }
.progress-pill {
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 20px; padding: 6px 14px;
  font-size: 0.8rem; color: var(--muted);
  display: flex; align-items: center; gap: 8px;
}
.progress-pill .pct { font-weight: 700; color: var(--orange); font-size: 0.9rem; }

/* LAYOUT */
.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: calc(100vh - 60px);
}
@media (max-width: 860px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { position: static; height: auto; border-right: none; border-bottom: 1px solid var(--border); }
}

/* SIDEBAR */
.sidebar {
  position: sticky; top: 60px;
  height: calc(100vh - 60px);
  overflow-y: auto;
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 28px 0;
  display: flex; flex-direction: column;
}
.sidebar::-webkit-scrollbar { width: 3px; }
.sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

.muni-card { padding: 0 20px 24px; border-bottom: 1px solid var(--border); margin-bottom: 8px; }
.muni-nombre { font-family: var(--font-display); font-size: 1.6rem; font-weight: 800; line-height: 1.1; margin-bottom: 4px; }
.muni-dept { color: var(--orange); font-size: 0.88rem; font-weight: 500; margin-bottom: 12px; }
.muni-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.muni-chip {
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 16px; padding: 4px 10px;
  font-size: 0.75rem; color: var(--muted);
}

/* NAV MENU */
.nav-label { padding: 16px 20px 8px; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); }

.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 20px; cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.15s ease;
  text-decoration: none; color: var(--muted);
}
.nav-item:hover { background: var(--surface2); color: var(--text); }
.nav-item.active {
  background: var(--orange-glow);
  border-left-color: var(--orange);
  color: var(--text);
}
.nav-icon {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.95rem; background: var(--surface2);
  transition: background 0.15s;
  flex-shrink: 0;
}
.nav-item.active .nav-icon { background: var(--orange-glow); }
.nav-text { flex: 1; }
.nav-title { font-size: 1rem; font-weight: 500; display: block; line-height: 1.2; }
.nav-sub { font-size: 0.72rem; color: var(--muted); display: block; margin-top: 1px; }
.nav-item.active .nav-sub { color: var(--orange); opacity: 0.8; }

.nav-status {
  width: 20px; height: 20px; border-radius: 50%;
  border: 1.5px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.6rem; flex-shrink: 0;
  transition: all 0.2s;
}
.nav-status.done { background: var(--green); border-color: var(--green); color: #fff; font-size: 0.65rem; }
.nav-status.partial { background: var(--yellow); border-color: var(--yellow); color: #fff; }

/* FESTIVALES en sidebar */
.sidebar-fests { padding: 16px 20px; border-top: 1px solid var(--border); margin-top: auto; }
.sidebar-fests-title { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); margin-bottom: 12px; }
.fest-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); }
.fest-item:last-child { border-bottom: none; }
.fest-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--orange); margin-top: 7px; flex-shrink: 0; }
.fest-item strong { display: block; font-size: 0.85rem; font-weight: 500; line-height: 1.3; }
.fest-item span { font-size: 0.75rem; color: var(--muted); }
.empty { font-size: 0.82rem; color: var(--muted); font-style: italic; }

/* MAIN */
.main { padding: 40px 52px 100px; max-width: 860px; }
@media (max-width: 860px) { .main { padding: 28px 20px 80px; } }

/* SUCCESS */
.success-banner {
  display: none;
  background: var(--green-bg); border: 1.5px solid var(--green);
  border-radius: 20px; padding: 48px 40px; text-align: center; margin-bottom: 40px;
}
.success-banner .check { font-size: 3.5rem; margin-bottom: 16px; }
.success-banner h3 { font-family: var(--font-display); color: var(--green); font-size: 1.6rem; margin-bottom: 8px; }
.success-banner p { color: var(--muted); font-size: 1.05rem; line-height: 1.6; }

/* SECTIONS */
.form-section {
  margin-bottom: 48px;
  scroll-margin-top: 80px;
  opacity: 0; transform: translateY(20px);
  animation: fadeUp 0.45s ease forwards;
}
.form-section:nth-child(1){animation-delay:.05s}
.form-section:nth-child(2){animation-delay:.1s}
.form-section:nth-child(3){animation-delay:.15s}
.form-section:nth-child(4){animation-delay:.2s}
.form-section:nth-child(5){animation-delay:.25s}

@keyframes fadeUp { to { opacity:1; transform:translateY(0); } }

.form-section.highlight .section-card {
  border-color: var(--orange);
  box-shadow: 0 0 0 3px var(--orange-glow);
}

.section-head {
  display: flex; align-items: flex-start; gap: 16px;
  margin-bottom: 24px;
}
.section-icon-lg {
  width: 44px; height: 44px; border-radius: 12px;
  background: var(--orange-glow); color: var(--orange);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; flex-shrink: 0;
}
.section-title { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; margin-bottom: 4px; }
.section-desc { font-size: 0.95rem; color: var(--muted); line-height: 1.5; }

.section-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px; padding: 28px;
  transition: border-color 0.3s, box-shadow 0.3s;
}

/* FIELDS */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
@media (max-width: 600px) { .grid-2, .grid-3 { grid-template-columns: 1fr; } }

.field { margin-bottom: 20px; }
.field:last-child { margin-bottom: 0; }
.field label {
  display: block;
   font-size: 0.85rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.8px;
  color: var(--muted); margin-bottom: 8px;
}
.field input, .field textarea {
  width: 100%;
  background: var(--surface2);
  border: 1.5px solid var(--border);
  border-radius: 11px;
  padding: 13px 16px;
  color: var(--text);
  font-size: 1.05rem;
  font-family: var(--font-body);
  outline: none;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}
.field input:focus, .field textarea:focus {
  border-color: var(--orange);
  background: #ff6b350a;
  box-shadow: 0 0 0 3px var(--orange-glow);
}
.field textarea { resize: vertical; min-height: 110px; line-height: 1.6; }
.field input::placeholder, .field textarea::placeholder { color: #2a2a50; }
.field-note { font-size: 0.8rem; color: var(--muted); margin-top: 8px; line-height: 1.5; }

/* HOTEL ROWS */
.hotel-block {
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 12px; padding: 18px; margin-bottom: 12px;
}
.hotel-num { font-size: 0.72rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }

/* FESTIVALES NUEVOS */
.festival-nuevo {
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 12px; padding: 20px; margin-bottom: 12px; position: relative;
}
.festival-nuevo-num { font-size: 0.72rem; font-weight: 700; color: var(--orange); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
.btn-remove {
  position: absolute; top: 14px; right: 14px;
  background: transparent; border: 1px solid var(--border);
  color: var(--muted); border-radius: 6px; width: 26px; height: 26px;
  cursor: pointer; font-size: 0.8rem;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.btn-remove:hover { border-color: #ff4444; color: #ff4444; }

.btn-add {
  width: 100%; background: transparent;
  border: 1.5px dashed var(--border); color: var(--muted);
  border-radius: 11px; padding: 14px;
  font-size: 0.92rem; font-family: var(--font-body);
  cursor: pointer; transition: all 0.15s;
}
.btn-add:hover { border-color: var(--orange); color: var(--orange); }

/* SAVE BAR */
.save-bar {
  position: sticky; bottom: 0;
  background: linear-gradient(to top, var(--bg) 60%, transparent);
  padding: 28px 0 0; margin-top: 8px;
}
.btn-submit {
  width: 100%; background: var(--orange); color: #fff; border: none;
  border-radius: 13px; padding: 18px;
  font-size: 1.05rem; font-weight: 700;
  font-family: var(--font-display); cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  letter-spacing: 0.3px;
}
.btn-submit:hover { background: #e55a25; }
.btn-submit:active { transform: scale(0.99); }
.btn-submit:disabled { background: #2a2a40; color: var(--muted); cursor: not-allowed; }
</style>
</head>
<body>

<div class="topbar">
  <div class="topbar-left">
    <div class="logo">FestQuest</div>
    <div class="muni-crumb">/ <strong>${m.nombre}</strong> / Portal municipio</div>
  </div>
  <div class="topbar-right">
    <div class="progress-pill">Perfil <span class="pct" id="topPct">0%</span> completo</div>
  </div>
</div>

<div class="layout">

  <!-- SIDEBAR NAV -->
  <aside class="sidebar">
    <div class="muni-card">
      <div class="muni-nombre">${m.nombre}</div>
      <div class="muni-dept">${m.departamento}${m.subregion?' · '+m.subregion:''}</div>
      <div class="muni-chips">
        ${ok(m.habitantes)?`<div class="muni-chip">👥 ${Number(m.habitantes).toLocaleString('es-CO')}</div>`:''}
        ${ok(m.altura)?`<div class="muni-chip">⛰️ ${m.altura}m</div>`:''}
        ${ok(m.temperatura_promedio)?`<div class="muni-chip">🌡️ ${m.temperatura_promedio}°C</div>`:''}
        ${!ok(m.habitantes)&&!ok(m.altura)&&!ok(m.temperatura_promedio)?'<div class="muni-chip">Sin datos aún</div>':''}
      </div>
    </div>

    <div class="nav-label">Secciones del formulario</div>

    <a class="nav-item active" data-section="sec-general" onclick="goTo('sec-general',this)">
      <div class="nav-icon">🏙️</div>
      <div class="nav-text">
        <span class="nav-title">Datos generales</span>
        <span class="nav-sub">Gentilicio, habitantes, descripción</span>
      </div>
      <div class="nav-status ${secStatus.general?'done':''}" id="ns-general">${secStatus.general?'✓':''}</div>
    </a>

    <a class="nav-item" data-section="sec-alcalde" onclick="goTo('sec-alcalde',this)">
      <div class="nav-icon">👤</div>
      <div class="nav-text">
        <span class="nav-title">Autoridad municipal</span>
        <span class="nav-sub">Alcalde/sa, correo, teléfono</span>
      </div>
      <div class="nav-status ${secStatus.alcalde?'done':''}" id="ns-alcalde">${secStatus.alcalde?'✓':''}</div>
    </a>

    <a class="nav-item" data-section="sec-sitios" onclick="goTo('sec-sitios',this)">
      <div class="nav-icon">📍</div>
      <div class="nav-text">
        <span class="nav-title">Sitios turísticos</span>
        <span class="nav-sub">Hasta 5 atractivos</span>
      </div>
      <div class="nav-status ${secStatus.sitios?'done':''}" id="ns-sitios">${secStatus.sitios?'✓':''}</div>
    </a>

    <a class="nav-item" data-section="sec-hoteles" onclick="goTo('sec-hoteles',this)">
      <div class="nav-icon">🏨</div>
      <div class="nav-text">
        <span class="nav-title">Alojamiento</span>
        <span class="nav-sub">Hoteles y hospedajes</span>
      </div>
      <div class="nav-status ${secStatus.hoteles?'done':''}" id="ns-hoteles">${secStatus.hoteles?'✓':''}</div>
    </a>

    <a class="nav-item" data-section="sec-festivales" onclick="goTo('sec-festivales',this)">
      <div class="nav-icon">🎉</div>
      <div class="nav-text">
        <span class="nav-title">Proponer festivales</span>
        <span class="nav-sub">Agregar festivales faltantes</span>
      </div>
      <div class="nav-status" id="ns-festivales"></div>
    </a>

    <div class="sidebar-fests">
      <div class="sidebar-fests-title">📅 Festivales en FestQuest</div>
      ${festivalesHTML}
    </div>
  </aside>

  <!-- MAIN FORM -->
  <main class="main">

    <div id="success" class="success-banner">
      <div class="check">✅</div>
      <h3>¡Información guardada!</h3>
      <p>Los datos de <strong>${m.nombre}</strong> ya están actualizados en FestQuest.<br>Gracias por completar el perfil de su municipio.</p>
    </div>

    <form id="municipioForm">
      <input type="hidden" name="token" value="${token}">
      <input type="hidden" name="municipio_id" value="${m.id}">

      <!-- DATOS GENERALES -->
      <div class="form-section" id="sec-general">
        <div class="section-head">
          <div class="section-icon-lg">🏙️</div>
          <div>
            <div class="section-title">Datos generales</div>
            <div class="section-desc">Información básica que aparece en la ficha del municipio en FestQuest.</div>
          </div>
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
          <div class="grid-2">
            <div class="field">
              <label>Altura (m.s.n.m)</label>
              <input type="number" name="altura" placeholder="Ej: 1900" value="${v(m.altura)}">
            </div>
            <div class="field">
              <label>Temperatura promedio (°C)</label>
              <input type="number" step="0.1" name="temperatura_promedio" placeholder="Ej: 22" value="${v(m.temperatura_promedio)}">
            </div>
          </div>
          <div class="field">
            <label>Descripción del municipio</label>
            <textarea name="descripcion" placeholder="Historia, cultura, gastronomía, atractivos naturales, por qué vale la pena visitarlo...">${v(m.descripcion)}</textarea>
            <div class="field-note">Este texto aparecerá cuando alguien explore los festivales de su municipio en FestQuest.</div>
          </div>
        </div>
      </div>

      <!-- ALCALDE -->
      <div class="form-section" id="sec-alcalde">
        <div class="section-head">
          <div class="section-icon-lg">👤</div>
          <div>
            <div class="section-title">Autoridad municipal</div>
            <div class="section-desc">Contacto oficial de la alcaldía para los visitantes que quieran más información.</div>
          </div>
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
          <div>
            <div class="section-title">Sitios turísticos</div>
            <div class="section-desc">Los atractivos principales que los visitantes deben conocer al llegar a su municipio.</div>
          </div>
        </div>
        <div class="section-card">
          <div class="grid-2">
            ${[0,1,2,3,4].map(i=>`
            <div class="field">
              <label>Sitio ${i+1}${i===0?' (principal)':''}</label>
              <input type="text" name="sitio_${i}" placeholder="${i===0?'Ej: Parque principal':'Opcional'}" value="${sitios[i]||''}">
            </div>`).join('')}
          </div>
          <div class="field-note">Parques, iglesias, ríos, cascadas, monumentos, museos, miradores, reservas naturales, etc.</div>
        </div>
      </div>

      <!-- ALOJAMIENTO -->
      <div class="form-section" id="sec-hoteles">
        <div class="section-head">
          <div class="section-icon-lg">🏨</div>
          <div>
            <div class="section-title">Alojamiento</div>
            <div class="section-desc">Hoteles y hospedajes recomendados para que los visitantes planeen su estadía.</div>
          </div>
        </div>
        <div class="section-card">
          ${[0,1,2].map(i=>`
          <div class="hotel-block">
            <div class="hotel-num">Hotel / Hospedaje ${i+1}${i===0?'':' (opcional)'}</div>
            <div class="grid-2">
              <div class="field" style="margin:0">
                <label>Nombre del establecimiento</label>
                <input type="text" name="hotel_nombre_${i}" placeholder="Nombre del hotel" value="${hoteles[i]||''}">
              </div>
              <div class="field" style="margin:0">
                <label>WhatsApp / Teléfono de reservas</label>
                <input type="tel" name="hotel_tel_${i}" placeholder="+57 300 000 0000" value="${contactos[i]||''}">
              </div>
            </div>
          </div>`).join('')}
          <div class="field-note">Esta información ayuda a los visitantes a contactar directamente al alojamiento.</div>
        </div>
      </div>

      <!-- FESTIVALES NUEVOS -->
      <div class="form-section" id="sec-festivales">
        <div class="section-head">
          <div class="section-icon-lg">🎉</div>
          <div>
            <div class="section-title">Proponer festivales</div>
            <div class="section-desc">¿Hay festivales de su municipio que no aparecen en FestQuest? Agréguelos y los verificaremos para publicarlos.</div>
          </div>
        </div>
        <div class="section-card">
          <div id="festivalesNuevos"></div>
          <button type="button" class="btn-add" onclick="agregarFestival()">+ Agregar festival</button>
        </div>
      </div>

      <div class="save-bar">
        <button type="submit" class="btn-submit" id="btnEnviar">
          Guardar información del municipio
        </button>
      </div>
    </form>
  </main>
</div>

<script>
// ── Navegación sidebar ────────────────────────────────────────────
function goTo(sectionId, navEl) {
  // Desactivar todos
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (navEl) navEl.classList.add('active');

  // Scroll a la sección
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Highlight temporal
    section.classList.add('highlight');
    setTimeout(() => section.classList.remove('highlight'), 1500);
  }
}

// Scroll spy — detecta qué sección está visible
const sections = ['sec-general','sec-alcalde','sec-sitios','sec-hoteles','sec-festivales'];
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.section === id);
      });
    }
  });
}, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });
sections.forEach(id => {
  const el = document.getElementById(id);
  if (el) observer.observe(el);
});

// ── Progress ────────────────────────────────────────────────────
const progressFields = [
  { fields: ['gentilicio','habitantes','descripcion'], ns: 'ns-general' },
  { fields: ['alcalde','correo_alcalde'], ns: 'ns-alcalde' },
  { fields: ['sitio_0'], ns: 'ns-sitios' },
  { fields: ['hotel_nombre_0'], ns: 'ns-hoteles' },
];

function calcProgress() {
  let done = 0;
  progressFields.forEach(({ fields, ns }) => {
    const filled = fields.some(n => {
      const el = document.querySelector('[name="'+n+'"]');
      return el && el.value.trim() !== '';
    });
    const statusEl = document.getElementById(ns);
    if (statusEl) {
      statusEl.classList.toggle('done', filled);
      statusEl.textContent = filled ? '✓' : '';
    }
    if (filled) done++;
  });
  const pct = Math.round((done / progressFields.length) * 100);
  const topPct = document.getElementById('topPct');
  if (topPct) topPct.textContent = pct + '%';
}

document.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', calcProgress));
calcProgress();

// ── Festivales nuevos ─────────────────────────────────────────
let festivalCount = 0;
function agregarFestival() {
  const container = document.getElementById('festivalesNuevos');
  const idx = festivalCount++;
  const div = document.createElement('div');
  div.className = 'festival-nuevo';
  div.id = 'festival_' + idx;
  div.innerHTML = \`
    <button type="button" class="btn-remove" onclick="document.getElementById('festival_\${idx}').remove()">✕</button>
    <div class="festival-nuevo-num">Festival propuesto \${idx + 1}</div>
    <div class="field">
      <label>Nombre del festival</label>
      <input type="text" name="fest_nombre_\${idx}" placeholder="Ej: Festival del Folclor">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="field">
        <label>Fecha de inicio</label>
        <input type="date" name="fest_inicio_\${idx}">
      </div>
      <div class="field">
        <label>Fecha de finalización</label>
        <input type="date" name="fest_fin_\${idx}">
      </div>
    </div>
    <div class="field">
      <label>Descripción breve (opcional)</label>
      <input type="text" name="fest_desc_\${idx}" placeholder="Tipo de festival, tradición, año de fundación...">
    </div>
  \`;
  container.appendChild(div);
  div.querySelector('input').focus();

  // Marcar sección festivales como activa
  const ns = document.getElementById('ns-festivales');
  if (ns) { ns.classList.add('partial'); ns.textContent = '•'; }
}

// ── Submit ───────────────────────────────────────────────────
document.getElementById('municipioForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = document.getElementById('btnEnviar');
  btn.disabled = true; btn.textContent = 'Guardando...';

  const fd = new FormData(this);
  const data = Object.fromEntries(fd.entries());

  const sitios = [0,1,2,3,4].map(i=>(data['sitio_'+i]||'').trim()).filter(Boolean).join('|');
  const hots = [0,1,2].map(i=>(data['hotel_nombre_'+i]||'').trim()).filter(Boolean).join('|');
  const cons = [0,1,2].map(i=>(data['hotel_tel_'+i]||'').trim()).filter(Boolean).join('|');

  const festivalesNuevos = [];
  for (let i = 0; i < festivalCount; i++) {
    if (!document.getElementById('festival_'+i)) continue;
    const nombre = (data['fest_nombre_'+i]||'').trim();
    if (!nombre) continue;
    festivalesNuevos.push({ nombre, fecha_inicio: data['fest_inicio_'+i]||null, fecha_fin: data['fest_fin_'+i]||null, descripcion: data['fest_desc_'+i]||null });
  }

  const payload = {
    token: data.token, alcalde: data.alcalde||null, correo_alcalde: data.correo_alcalde||null,
    telefono: data.telefono||null, descripcion: data.descripcion||null,
    gentilicio: data.gentilicio||null, habitantes: data.habitantes||null,
    altura: data.altura||null, temperatura_promedio: data.temperatura_promedio||null,
    subregion: data.subregion||null, sitios_turisticos: sitios||null,
    hoteles: hots||null, contacto_hoteles: cons||null, festivales_nuevos: festivalesNuevos
  };

  try {
    const res = await fetch('/api/municipio/'+data.municipio_id+'/actualizar', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.ok) {
      document.getElementById('success').style.display = 'block';
      document.getElementById('municipioForm').style.display = 'none';
      window.scrollTo({top:0,behavior:'smooth'});
    } else throw new Error(json.error||'Error desconocido');
  } catch(err) {
    btn.disabled = false; btn.textContent = 'Guardar información del municipio';
    alert('Error al guardar: '+err.message);
  }
});
</script>
</body>
</html>`);

  } catch (err) {
    console.error('Error en formulario municipio:', err);
    res.status(500).send(htmlError('Error interno del servidor'));
  }
});

router.post('/api/municipio/:id/actualizar', async (req, res) => {
  const { id } = req.params;
  const { token, alcalde, correo_alcalde, telefono, descripcion, gentilicio, habitantes, altura, temperatura_promedio, subregion, sitios_turisticos, hoteles, contacto_hoteles, festivales_nuevos } = req.body;
  if (!token) return res.status(400).json({ ok: false, error: 'Token requerido' });
  try {
    const { rows } = await pool.query('SELECT id FROM municipalities WHERE id=$1 AND token_edicion=$2',[id,token]);
    if (!rows.length) return res.status(403).json({ ok:false, error:'Token inválido' });
    await pool.query(
      `UPDATE municipalities SET alcalde=COALESCE($1,alcalde), correo_alcalde=COALESCE($2,correo_alcalde),
        telefono=COALESCE($3,telefono), descripcion=COALESCE($4,descripcion),
        gentilicio=COALESCE($5,gentilicio), habitantes=COALESCE($6::integer,habitantes),
        altura=COALESCE($7::integer,altura), temperatura_promedio=COALESCE($8::numeric,temperatura_promedio),
        subregion=COALESCE($9,subregion), sitios_turisticos=COALESCE($10,sitios_turisticos),
        hoteles=COALESCE($11,hoteles), contacto_hoteles=COALESCE($12,contacto_hoteles),
        fecha_actualizacion=NOW() WHERE id=$13`,
      [alcalde,correo_alcalde,telefono,descripcion,gentilicio,habitantes||null,altura||null,temperatura_promedio||null,subregion,sitios_turisticos,hoteles,contacto_hoteles,id]
    );
    if (festivales_nuevos?.length) {
      for (const f of festivales_nuevos) {
        if (!f.nombre) continue;
        await pool.query(
          'INSERT INTO festivals (nombre,municipio_id,fecha_inicio,fecha_fin,descripcion) VALUES ($1,$2,$3::date,$4::date,$5)',
          [f.nombre,id,f.fecha_inicio||null,f.fecha_fin||null,f.descripcion||null]
        ).catch(()=>{});
      }
    }
    res.json({ ok:true });
  } catch(err) {
    console.error('Error actualizando municipio:',err);
    res.status(500).json({ ok:false, error:'Error interno' });
  }
});

router.get('/api/admin/municipios-estado', async (req, res) => {
  const { admintoken } = req.query;
  if (admintoken !== process.env.ADMIN_TOKEN) return res.status(403).json({ error:'No autorizado' });
  try {
    const { rows } = await pool.query(`
      SELECT m.id, m.nombre, m.departamento, m.token_edicion, m.fecha_actualizacion,
        (m.alcalde IS NOT NULL AND m.alcalde!='') AS tiene_alcalde,
        (m.sitios_turisticos IS NOT NULL AND m.sitios_turisticos!='') AS tiene_sitios,
        (m.hoteles IS NOT NULL AND m.hoteles!='') AS tiene_hoteles,
        (m.descripcion IS NOT NULL AND m.descripcion!='') AS tiene_descripcion,
        COUNT(f.id) AS num_festivales
      FROM municipalities m JOIN festivals f ON f.municipio_id=m.id
      WHERE m.token_edicion IS NOT NULL GROUP BY m.id
      ORDER BY m.fecha_actualizacion DESC NULLS LAST, num_festivales DESC
    `);
    res.json({ total:rows.length, completados:rows.filter(r=>r.tiene_alcalde&&r.tiene_sitios).length, municipios:rows });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

function htmlError(msg) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:sans-serif;background:#07070f;color:#eeeeff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}
    .box{background:#0d0d1c;border:1px solid #ff6b35;border-radius:16px;padding:32px;max-width:400px;text-align:center;}
    h2{color:#ff6b35;margin-bottom:12px;}p{color:#5a5a80;font-size:0.95rem;}
  </style></head><body><div class="box"><h2>FestQuest</h2><p>${msg}</p></div></body></html>`;
}

module.exports = router;