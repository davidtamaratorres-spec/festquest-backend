const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function ok(val) {
  return val !== null && val !== undefined && val !== 'N/A' && String(val).trim() !== '';
}
function v(val) { return ok(val) ? String(val) : ''; }

router.get('/municipio/:slug/editar', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('<h2>Token requerido</h2>');

  try {
    const { rows } = await pool.query(
      `SELECT m.*,
        (SELECT json_agg(q) FROM (
          SELECT f.id, f.nombre, f.fecha_inicio, f.fecha_fin
          FROM festivals f WHERE f.municipio_id = m.id
          ORDER BY f.fecha_inicio ASC NULLS LAST
        ) q) AS festivales
       FROM municipalities m WHERE m.token_edicion = $1`,
      [token]
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
          return `<div class="fest-tag"><span class="fest-dot"></span><div><strong>${f.nombre}</strong>${ini ? `<span>${ini}${fin?' – '+fin:''}</span>` : ''}</div></div>`;
        }).join('')
      : '<p class="empty-note">No hay festivales registrados</p>';

    const chips = [
      ok(m.habitantes) ? `<div class="chip">👥 ${Number(m.habitantes).toLocaleString('es-CO')} hab.</div>` : '',
      ok(m.altura) ? `<div class="chip">⛰️ ${m.altura} m.s.n.m</div>` : '',
      ok(m.temperatura_promedio) ? `<div class="chip">🌡️ ${m.temperatura_promedio}°C</div>` : '',
    ].filter(Boolean).join('');

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${m.nombre} — FestQuest</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
:root {
  --orange: #ff6b35;
  --orange-dim: #ff6b3520;
  --bg: #080810;
  --surface: #0f0f1a;
  --surface2: #161625;
  --border: #1e1e32;
  --text: #f0f0f8;
  --muted: #6b6b8a;
  --green: #2ecc71;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: 'DM Sans', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
}

/* HEADER */
.topbar {
  position: sticky; top: 0; z-index: 100;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 0 32px;
  display: flex; align-items: center; justify-content: space-between;
  height: 56px;
}
.topbar-logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.2rem; color: var(--orange); letter-spacing: -0.5px; }
.topbar-badge { font-size: 0.75rem; background: var(--orange-dim); color: var(--orange); padding: 4px 10px; border-radius: 20px; font-weight: 600; }

/* LAYOUT */
.layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  min-height: calc(100vh - 56px);
  max-width: 1280px;
  margin: 0 auto;
}
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { position: static !important; height: auto !important; }
}

/* SIDEBAR */
.sidebar {
  position: sticky;
  top: 56px;
  height: calc(100vh - 56px);
  overflow-y: auto;
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.sidebar::-webkit-scrollbar { width: 4px; }
.sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

.muni-header { }
.muni-nombre {
  font-family: 'Syne', sans-serif;
  font-size: 2rem; font-weight: 800;
  color: var(--text); line-height: 1;
  margin-bottom: 6px;
}
.muni-dept { color: var(--orange); font-size: 0.9rem; font-weight: 500; margin-bottom: 16px; }
.muni-gentilicio { color: var(--muted); font-size: 0.85rem; font-style: italic; margin-bottom: 16px; }

.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 20px; padding: 5px 12px;
  font-size: 0.78rem; color: var(--muted); font-weight: 500;
}

.divider { height: 1px; background: var(--border); }

.sidebar-section-title {
  font-family: 'Syne', sans-serif;
  font-size: 0.7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.5px;
  color: var(--orange); margin-bottom: 12px;
}

.fest-tag {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.fest-tag:last-child { border-bottom: none; }
.fest-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--orange); margin-top: 6px; flex-shrink: 0;
}
.fest-tag strong { display: block; font-size: 0.88rem; font-weight: 500; margin-bottom: 2px; }
.fest-tag span { font-size: 0.78rem; color: var(--muted); }

.progress-section { }
.progress-label { font-size: 0.78rem; color: var(--muted); margin-bottom: 8px; }
.progress-bar { background: var(--border); border-radius: 4px; height: 6px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--orange); border-radius: 4px; transition: width 0.5s ease; }
.progress-steps { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
.step { display: flex; align-items: center; gap: 10px; font-size: 0.82rem; color: var(--muted); }
.step.done { color: var(--green); }
.step-icon { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 0.65rem; flex-shrink: 0; }
.step.done .step-icon { background: var(--green); border-color: var(--green); color: #fff; }

.empty-note { color: var(--muted); font-size: 0.85rem; font-style: italic; }

/* MAIN FORM */
.main {
  padding: 40px 48px 80px;
  overflow-y: auto;
}
@media (max-width: 900px) { .main { padding: 24px 20px 60px; } }

.success-banner {
  display: none;
  background: #0a2e1a; border: 1.5px solid var(--green);
  border-radius: 16px; padding: 40px; text-align: center; margin-bottom: 32px;
}
.success-banner .check { font-size: 3rem; margin-bottom: 12px; }
.success-banner h3 { font-family: 'Syne', sans-serif; color: var(--green); font-size: 1.4rem; margin-bottom: 8px; }
.success-banner p { color: var(--muted); font-size: 0.95rem; }

.section {
  margin-bottom: 32px;
  opacity: 0; transform: translateY(16px);
  animation: fadeUp 0.4s ease forwards;
}
.section:nth-child(1) { animation-delay: 0.05s; }
.section:nth-child(2) { animation-delay: 0.1s; }
.section:nth-child(3) { animation-delay: 0.15s; }
.section:nth-child(4) { animation-delay: 0.2s; }
.section:nth-child(5) { animation-delay: 0.25s; }
.section:nth-child(6) { animation-delay: 0.3s; }

@keyframes fadeUp {
  to { opacity: 1; transform: translateY(0); }
}

.section-header {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.section-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--orange-dim); display: flex; align-items: center; justify-content: center;
  font-size: 1rem; flex-shrink: 0;
}
.section-title { font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 700; }
.section-sub { font-size: 0.78rem; color: var(--muted); margin-top: 2px; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
@media (max-width: 640px) { .grid-2, .grid-3 { grid-template-columns: 1fr; } }

.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.field:last-child { margin-bottom: 0; }
.field label {
  font-size: 0.72rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.8px;
  color: var(--muted);
}
.field input, .field textarea, .field select {
  background: var(--surface2);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 11px 14px;
  color: var(--text);
  font-size: 0.92rem;
  font-family: 'DM Sans', sans-serif;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  width: 100%;
}
.field input:focus, .field textarea:focus {
  border-color: var(--orange);
  background: #ff6b350a;
}
.field textarea { resize: vertical; min-height: 100px; line-height: 1.5; }
.field input::placeholder, .field textarea::placeholder { color: #333350; }
.field-note { font-size: 0.74rem; color: var(--muted); line-height: 1.4; }

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
}

.hotel-row {
  display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: end;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 12px; padding: 14px; margin-bottom: 10px;
}
.hotel-sep { color: var(--muted); font-size: 0.8rem; text-align: center; padding-bottom: 8px; }
@media (max-width: 640px) {
  .hotel-row { grid-template-columns: 1fr; }
  .hotel-sep { display: none; }
}

.festival-nuevo {
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 12px; padding: 16px; margin-bottom: 10px;
  position: relative;
}
.festival-nuevo-num {
  font-size: 0.7rem; font-weight: 700; color: var(--orange);
  text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;
}
.btn-remove {
  position: absolute; top: 12px; right: 12px;
  background: transparent; border: 1px solid var(--border);
  color: var(--muted); border-radius: 6px;
  width: 24px; height: 24px; cursor: pointer;
  font-size: 0.75rem; display: flex; align-items: center; justify-content: center;
  transition: border-color 0.2s, color 0.2s;
}
.btn-remove:hover { border-color: #ff4444; color: #ff4444; }

.btn-add {
  width: 100%; background: transparent;
  border: 1.5px dashed var(--border);
  color: var(--muted); border-radius: 10px;
  padding: 12px; font-size: 0.88rem;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer; margin-top: 4px;
  transition: border-color 0.2s, color 0.2s;
}
.btn-add:hover { border-color: var(--orange); color: var(--orange); }

.btn-submit {
  width: 100%; background: var(--orange);
  color: #fff; border: none; border-radius: 12px;
  padding: 16px; font-size: 1rem; font-weight: 700;
  font-family: 'Syne', sans-serif; cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  margin-top: 8px; letter-spacing: 0.3px;
}
.btn-submit:hover { background: #e55a25; }
.btn-submit:active { transform: scale(0.99); }
.btn-submit:disabled { background: #333; cursor: not-allowed; }

.save-sticky {
  position: sticky; bottom: 0;
  background: linear-gradient(to top, var(--bg) 70%, transparent);
  padding: 24px 0 0;
  margin-top: 8px;
}
</style>
</head>
<body>

<div class="topbar">
  <div class="topbar-logo">FestQuest</div>
  <div class="topbar-badge">Portal de municipios</div>
</div>

<div class="layout">

  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="muni-header">
      <div class="muni-nombre">${m.nombre}</div>
      <div class="muni-dept">${m.departamento}${m.subregion ? ' · ' + m.subregion : ''}</div>
      ${ok(m.gentilicio) ? `<div class="muni-gentilicio">${m.gentilicio}</div>` : ''}
      <div class="chips">${chips || '<span class="chip">Sin datos aún</span>'}</div>
    </div>

    <div class="divider"></div>

    <div>
      <div class="sidebar-section-title">📅 Festivales registrados</div>
      ${festivalesHTML}
    </div>

    <div class="divider"></div>

    <div class="progress-section">
      <div class="sidebar-section-title">✅ Completitud del perfil</div>
      <div class="progress-label" id="progressLabel">Calculando...</div>
      <div class="progress-bar"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>
      <div class="progress-steps">
        <div class="step ${ok(m.alcalde) ? 'done' : ''}" id="step-alcalde"><div class="step-icon">${ok(m.alcalde) ? '✓' : ''}</div> Alcalde/sa</div>
        <div class="step ${ok(m.correo_alcalde) ? 'done' : ''}" id="step-correo"><div class="step-icon">${ok(m.correo_alcalde) ? '✓' : ''}</div> Correo de contacto</div>
        <div class="step ${ok(m.descripcion) ? 'done' : ''}" id="step-desc"><div class="step-icon">${ok(m.descripcion) ? '✓' : ''}</div> Descripción</div>
        <div class="step ${ok(m.sitios_turisticos) ? 'done' : ''}" id="step-sitios"><div class="step-icon">${ok(m.sitios_turisticos) ? '✓' : ''}</div> Sitios turísticos</div>
        <div class="step ${ok(m.hoteles) ? 'done' : ''}" id="step-hoteles"><div class="step-icon">${ok(m.hoteles) ? '✓' : ''}</div> Alojamiento</div>
      </div>
    </div>
  </aside>

  <!-- MAIN -->
  <main class="main">

    <div id="success" class="success-banner">
      <div class="check">✅</div>
      <h3>¡Información guardada!</h3>
      <p>Los datos de ${m.nombre} ya están actualizados en FestQuest.<br>Gracias por completar el perfil de su municipio.</p>
    </div>

    <form id="municipioForm">
      <input type="hidden" name="token" value="${token}">
      <input type="hidden" name="municipio_id" value="${m.id}">

      <!-- Datos generales -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">🏙️</div>
          <div><div class="section-title">Datos generales</div><div class="section-sub">Información básica del municipio</div></div>
        </div>
        <div class="card">
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
            <div class="field-note">Este texto aparecerá en la ficha del municipio cuando alguien haga clic en un festival.</div>
          </div>
        </div>
      </div>

      <!-- Autoridad -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">👤</div>
          <div><div class="section-title">Autoridad municipal</div><div class="section-sub">Contacto oficial de la alcaldía</div></div>
        </div>
        <div class="card">
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

      <!-- Sitios turísticos -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">📍</div>
          <div><div class="section-title">Sitios turísticos</div><div class="section-sub">Hasta 5 atractivos principales</div></div>
        </div>
        <div class="card">
          <div class="grid-2">
            ${[0,1,2,3,4].map(i => `
            <div class="field">
              <label>Sitio ${i+1}${i===0?' (principal)':''}</label>
              <input type="text" name="sitio_${i}" placeholder="${i===0?'Ej: Parque principal':'Opcional'}" value="${sitios[i]||''}">
            </div>`).join('')}
          </div>
          <div class="field-note">Parques, iglesias, ríos, cascadas, monumentos, museos, miradores, etc.</div>
        </div>
      </div>

      <!-- Alojamiento -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">🏨</div>
          <div><div class="section-title">Alojamiento</div><div class="section-sub">Hoteles y hospedajes recomendados</div></div>
        </div>
        <div class="card">
          ${[0,1,2].map(i => `
          <div class="hotel-row">
            <div class="field" style="margin:0">
              <label>Nombre${i===0?'':' (opcional)'}</label>
              <input type="text" name="hotel_nombre_${i}" placeholder="Nombre del hotel" value="${hoteles[i]||''}">
            </div>
            <div class="hotel-sep">·</div>
            <div class="field" style="margin:0">
              <label>WhatsApp / Teléfono</label>
              <input type="tel" name="hotel_tel_${i}" placeholder="+57 300 000 0000" value="${contactos[i]||''}">
            </div>
          </div>`).join('')}
          <div class="field-note" style="margin-top:8px">Esta información ayuda a los visitantes a reservar donde quedarse.</div>
        </div>
      </div>

      <!-- Festivales nuevos -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">🎉</div>
          <div><div class="section-title">Proponer festivales</div><div class="section-sub">Festivales que no aparecen en FestQuest</div></div>
        </div>
        <div class="card">
          <div class="field-note" style="margin-bottom:16px">¿Hay festivales de su municipio que no aparecen aún? Agréguelos y los verificaremos para publicarlos.</div>
          <div id="festivalesNuevos"></div>
          <button type="button" class="btn-add" onclick="agregarFestival()">+ Agregar festival</button>
        </div>
      </div>

      <div class="save-sticky">
        <button type="submit" class="btn-submit" id="btnEnviar">
          Guardar información del municipio
        </button>
      </div>

    </form>
  </main>
</div>

<script>
  // Progress bar
  function calcProgress() {
    const fields = ['alcalde','correo_alcalde','descripcion','sitio_0','hotel_nombre_0'];
    const filled = fields.filter(n => {
      const el = document.querySelector('[name="'+n+'"]');
      return el && el.value.trim() !== '';
    }).length;
    const pct = Math.round((filled / fields.length) * 100);
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressLabel').textContent = pct + '% completado';

    const map = {
      'alcalde': 'step-alcalde',
      'correo_alcalde': 'step-correo',
      'descripcion': 'step-desc',
      'sitio_0': 'step-sitios',
      'hotel_nombre_0': 'step-hoteles'
    };
    Object.entries(map).forEach(([name, stepId]) => {
      const el = document.querySelector('[name="'+name+'"]');
      const step = document.getElementById(stepId);
      if (!step) return;
      if (el && el.value.trim() !== '') {
        step.classList.add('done');
        step.querySelector('.step-icon').textContent = '✓';
      } else {
        step.classList.remove('done');
        step.querySelector('.step-icon').textContent = '';
      }
    });
  }

  document.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', calcProgress);
  });
  calcProgress();

  // Festivales nuevos
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
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="field">
          <label>Fecha inicio</label>
          <input type="date" name="fest_inicio_\${idx}">
        </div>
        <div class="field">
          <label>Fecha fin</label>
          <input type="date" name="fest_fin_\${idx}">
        </div>
      </div>
      <div class="field">
        <label>Descripción breve (opcional)</label>
        <input type="text" name="fest_desc_\${idx}" placeholder="Tipo de festival, tradición cultural...">
      </div>
    \`;
    container.appendChild(div);
    div.querySelector('input').focus();
  }

  // Submit
  document.getElementById('municipioForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnEnviar');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const fd = new FormData(this);
    const data = Object.fromEntries(fd.entries());

    const sitios = [0,1,2,3,4].map(i=>(data['sitio_'+i]||'').trim()).filter(Boolean).join('|');
    const hoteles = [0,1,2].map(i=>(data['hotel_nombre_'+i]||'').trim()).filter(Boolean).join('|');
    const contactos = [0,1,2].map(i=>(data['hotel_tel_'+i]||'').trim()).filter(Boolean).join('|');

    const festivalesNuevos = [];
    for (let i = 0; i < festivalCount; i++) {
      const el = document.getElementById('festival_' + i);
      if (!el) continue;
      const nombre = (data['fest_nombre_'+i]||'').trim();
      if (!nombre) continue;
      festivalesNuevos.push({ nombre, fecha_inicio: data['fest_inicio_'+i]||null, fecha_fin: data['fest_fin_'+i]||null, descripcion: data['fest_desc_'+i]||null });
    }

    const payload = {
      token: data.token,
      alcalde: data.alcalde||null, correo_alcalde: data.correo_alcalde||null,
      telefono: data.telefono||null, descripcion: data.descripcion||null,
      gentilicio: data.gentilicio||null, habitantes: data.habitantes||null,
      altura: data.altura||null, temperatura_promedio: data.temperatura_promedio||null,
      subregion: data.subregion||null, sitios_turisticos: sitios||null,
      hoteles: hoteles||null, contacto_hoteles: contactos||null,
      festivales_nuevos: festivalesNuevos
    };

    try {
      const res = await fetch('/api/municipio/' + data.municipio_id + '/actualizar', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.ok) {
        document.getElementById('success').style.display = 'block';
        document.getElementById('municipioForm').style.display = 'none';
        window.scrollTo({top:0,behavior:'smooth'});
      } else throw new Error(json.error||'Error desconocido');
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Guardar información del municipio';
      alert('Error al guardar: ' + err.message);
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
    const { rows } = await pool.query('SELECT id FROM municipalities WHERE id = $1 AND token_edicion = $2', [id, token]);
    if (!rows.length) return res.status(403).json({ ok: false, error: 'Token inválido' });
    await pool.query(
      `UPDATE municipalities SET
        alcalde=COALESCE($1,alcalde), correo_alcalde=COALESCE($2,correo_alcalde),
        telefono=COALESCE($3,telefono), descripcion=COALESCE($4,descripcion),
        gentilicio=COALESCE($5,gentilicio), habitantes=COALESCE($6::integer,habitantes),
        altura=COALESCE($7::integer,altura), temperatura_promedio=COALESCE($8::numeric,temperatura_promedio),
        subregion=COALESCE($9,subregion), sitios_turisticos=COALESCE($10,sitios_turisticos),
        hoteles=COALESCE($11,hoteles), contacto_hoteles=COALESCE($12,contacto_hoteles),
        fecha_actualizacion=NOW()
       WHERE id=$13`,
      [alcalde,correo_alcalde,telefono,descripcion,gentilicio,habitantes||null,altura||null,temperatura_promedio||null,subregion,sitios_turisticos,hoteles,contacto_hoteles,id]
    );
    if (festivales_nuevos && festivales_nuevos.length > 0) {
      for (const f of festivales_nuevos) {
        if (!f.nombre) continue;
        await pool.query(
          `INSERT INTO festivals (nombre, municipio_id, fecha_inicio, fecha_fin, descripcion) VALUES ($1,$2,$3::date,$4::date,$5)`,
          [f.nombre, id, f.fecha_inicio||null, f.fecha_fin||null, f.descripcion||null]
        ).catch(()=>{});
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Error actualizando municipio:', err);
    res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

router.get('/api/admin/municipios-estado', async (req, res) => {
  const { admintoken } = req.query;
  if (admintoken !== process.env.ADMIN_TOKEN) return res.status(403).json({ error: 'No autorizado' });
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
    res.json({ total: rows.length, completados: rows.filter(r=>r.tiene_alcalde&&r.tiene_sitios).length, municipios: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function htmlError(msg) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:sans-serif;background:#080810;color:#f0f0f8;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}
    .box{background:#0f0f1a;border:1px solid #ff6b35;border-radius:16px;padding:32px;max-width:400px;text-align:center;}
    h2{color:#ff6b35;margin-bottom:12px;}p{color:#6b6b8a;font-size:0.9rem;}
  </style></head><body><div class="box"><h2>FestQuest</h2><p>${msg}</p></div></body></html>`;
}

module.exports = router;