const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function ok(val) {
  return val !== null && val !== undefined && val !== 'N/A' && String(val).trim() !== '';
}

function v(val) {
  return ok(val) ? String(val) : '';
}

router.get('/municipio/:slug/editar', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('<h2>Token requerido</h2>');

  try {
    const { rows } = await pool.query(
      `SELECT m.*,
        (SELECT json_agg(q) FROM (
          SELECT f.id, f.nombre, f.fecha_inicio, f.fecha_fin
          FROM festivals f
          WHERE f.municipio_id = m.id
          ORDER BY f.fecha_inicio ASC NULLS LAST
        ) q) AS festivales
       FROM municipalities m
       WHERE m.token_edicion = $1`,
      [token]
    );

    if (!rows.length) return res.status(404).send(htmlError('Token inválido o municipio no encontrado'));

    const m = rows[0];

    const sitios = m.sitios_turisticos ? m.sitios_turisticos.split('|') : ['', '', '', '', ''];
    while (sitios.length < 5) sitios.push('');

    const hoteles = m.hoteles ? m.hoteles.split('|') : ['', '', ''];
    const contactos = m.contacto_hoteles ? m.contacto_hoteles.split('|') : ['', '', ''];
    while (hoteles.length < 3) hoteles.push('');
    while (contactos.length < 3) contactos.push('');

    const festivales = m.festivales || [];
    const festivalesHTML = festivales.length
      ? festivales.map(f => {
          const inicio = f.fecha_inicio ? new Date(f.fecha_inicio).toISOString().split('T')[0] : '';
          const fin = f.fecha_fin ? new Date(f.fecha_fin).toISOString().split('T')[0] : '';
          const inicioFmt = f.fecha_inicio ? new Date(f.fecha_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
          const finFmt = f.fecha_fin ? new Date(f.fecha_fin).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
          return `<div class="festival-item">🎉 <strong>${f.nombre}</strong><span class="fecha">${inicioFmt}${finFmt ? ' - ' + finFmt : ''}</span></div>`;
        }).join('')
      : '<p style="opacity:0.6">No hay festivales registrados</p>';

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Actualizar datos — ${m.nombre} | FestQuest</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0d0d1a; color: #f0f0f0; min-height: 100vh; padding: 0 0 60px; }
  .header { background: #13131f; border-bottom: 2px solid #ff6b35; padding: 18px 24px; display: flex; align-items: center; gap: 12px; }
  .header .logo { font-size: 1.4rem; font-weight: 800; color: #ff6b35; letter-spacing: -0.5px; }
  .header .sub { font-size: 0.8rem; color: #888; margin-top: 2px; }
  .hero { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-bottom: 1px solid #2a2a3e; padding: 32px 24px 28px; max-width: 720px; margin: 0 auto; }
  .municipio-nombre { font-size: 2rem; font-weight: 800; color: #fff; line-height: 1.1; }
  .municipio-dept { color: #ff6b35; font-size: 0.95rem; margin-top: 6px; font-weight: 500; }
  .descripcion-hero { margin-top: 16px; font-size: 0.9rem; color: #aaa; line-height: 1.6; background: #1f1f35; border-left: 3px solid #ff6b35; padding: 12px 16px; border-radius: 0 8px 8px 0; }
  .festivales-section { max-width: 720px; margin: 24px auto 0; padding: 0 24px; }
  .section-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #ff6b35; margin-bottom: 10px; }
  .festival-item { background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 10px; padding: 12px 16px; margin-bottom: 8px; font-size: 0.9rem; display: flex; flex-direction: column; gap: 4px; }
  .festival-item .fecha { color: #888; font-size: 0.82rem; margin-left: 24px; }
  .form-container { max-width: 720px; margin: 28px auto 0; padding: 0 24px; }
  .card { background: #13131f; border: 1px solid #2a2a3e; border-radius: 16px; padding: 24px; margin-bottom: 20px; }
  .card-title { font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; }
  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: 0.8rem; font-weight: 600; color: #aaa; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .field input, .field textarea, .field select { width: 100%; background: #0d0d1a; border: 1.5px solid #2a2a3e; border-radius: 10px; padding: 12px 14px; color: #f0f0f0; font-size: 0.95rem; font-family: inherit; transition: border-color 0.2s; outline: none; }
  .field input:focus, .field textarea:focus, .field select:focus { border-color: #ff6b35; }
  .field textarea { resize: vertical; min-height: 90px; }
  .field input::placeholder, .field textarea::placeholder { color: #444; }
  .field select option { background: #1a1a2e; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  @media (max-width: 540px) { .field-row, .field-row-3 { grid-template-columns: 1fr; } }
  .hotel-group { background: #0d0d1a; border: 1px solid #1f1f35; border-radius: 12px; padding: 14px; margin-bottom: 12px; }
  .hotel-group-label { font-size: 0.75rem; color: #666; font-weight: 600; margin-bottom: 10px; text-transform: uppercase; }
  .festival-nuevo { background: #0d0d1a; border: 1px solid #1f1f35; border-radius: 12px; padding: 14px; margin-bottom: 12px; position: relative; }
  .festival-nuevo-label { font-size: 0.75rem; color: #666; font-weight: 600; margin-bottom: 10px; text-transform: uppercase; }
  .btn-add { background: transparent; border: 1.5px dashed #ff6b35; color: #ff6b35; border-radius: 10px; padding: 10px 16px; font-size: 0.9rem; font-weight: 600; cursor: pointer; width: 100%; margin-top: 4px; transition: background 0.2s; }
  .btn-add:hover { background: #ff6b3515; }
  .btn-remove { position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: #666; font-size: 1.1rem; cursor: pointer; line-height: 1; padding: 4px; }
  .btn-remove:hover { color: #ff4444; }
  .btn-submit { width: 100%; background: #ff6b35; color: #fff; border: none; border-radius: 12px; padding: 16px; font-size: 1.05rem; font-weight: 700; cursor: pointer; transition: background 0.2s, transform 0.1s; margin-top: 8px; }
  .btn-submit:hover { background: #e55a25; }
  .btn-submit:active { transform: scale(0.98); }
  .btn-submit:disabled { background: #444; cursor: not-allowed; }
  .success-banner { display: none; background: #0a2e1a; border: 1.5px solid #2ecc71; border-radius: 14px; padding: 24px; text-align: center; margin-bottom: 20px; }
  .success-banner .check { font-size: 2.5rem; margin-bottom: 8px; }
  .success-banner h3 { color: #2ecc71; font-size: 1.2rem; margin-bottom: 6px; }
  .success-banner p { color: #aaa; font-size: 0.9rem; }
  .note { font-size: 0.78rem; color: #555; margin-top: 6px; line-height: 1.4; }
  .dato-actual { font-size: 0.78rem; color: #ff6b35; margin-top: 4px; }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo">FestQuest</div>
    <div class="sub">Plataforma de festivales de Colombia</div>
  </div>
</div>

<div class="hero">
  <div class="municipio-nombre">${m.nombre}</div>
  <div class="municipio-dept">${m.departamento}${m.subregion ? ' · ' + m.subregion : ''}</div>
  <div class="descripcion-hero">
    Complete o corrija los datos de su municipio. La información ya registrada aparece precargada — verifíquela y actualice lo que sea necesario.
  </div>
</div>

<div class="festivales-section">
  <div class="section-label">📅 Festivales actuales en FestQuest</div>
  ${festivalesHTML}
</div>

<div class="form-container">

  <div id="success" class="success-banner">
    <div class="check">✅</div>
    <h3>¡Datos actualizados correctamente!</h3>
    <p>La información ya está visible en FestQuest. Gracias por completar el perfil de ${m.nombre}.</p>
  </div>

  <form id="municipioForm">
    <input type="hidden" name="token" value="${token}">
    <input type="hidden" name="municipio_id" value="${m.id}">

    <!-- Datos generales -->
    <div class="card">
      <div class="card-title"><span>🏙️</span> Datos generales del municipio</div>
      <div class="field-row">
        <div class="field">
          <label>Gentilicio</label>
          <input type="text" name="gentilicio" placeholder="Ej: Guatapeño/a" value="${v(m.gentilicio)}">
        </div>
        <div class="field">
          <label>Habitantes</label>
          <input type="number" name="habitantes" placeholder="Ej: 12000" value="${v(m.habitantes)}">
        </div>
      </div>
      <div class="field-row-3">
        <div class="field">
          <label>Altura (m.s.n.m)</label>
          <input type="number" name="altura" placeholder="Ej: 1900" value="${v(m.altura)}">
        </div>
        <div class="field">
          <label>Temperatura promedio (°C)</label>
          <input type="number" name="temperatura_promedio" placeholder="Ej: 22" value="${v(m.temperatura_promedio)}">
        </div>
        <div class="field">
          <label>Subregión</label>
          <input type="text" name="subregion" placeholder="Ej: Oriente Antioqueño" value="${v(m.subregion)}">
        </div>
      </div>
      <div class="field">
        <label>Descripción del municipio</label>
        <textarea name="descripcion" placeholder="Historia, cultura, gastronomía, por qué vale la pena visitarlo...">${v(m.descripcion)}</textarea>
        <div class="note">Este texto aparecerá en la ficha del municipio en FestQuest.</div>
      </div>
    </div>

    <!-- Alcalde -->
    <div class="card">
      <div class="card-title"><span>👤</span> Autoridad municipal</div>
      <div class="field">
        <label>Nombre completo del alcalde/sa</label>
        <input type="text" name="alcalde" placeholder="Ej: María García Rodríguez" value="${v(m.alcalde)}">
      </div>
      <div class="field-row">
        <div class="field">
          <label>Correo electrónico</label>
          <input type="email" name="correo_alcalde" placeholder="alcaldia@municipio.gov.co" value="${v(m.correo_alcalde)}">
        </div>
        <div class="field">
          <label>Teléfono / WhatsApp</label>
          <input type="tel" name="telefono" placeholder="+57 300 000 0000" value="${v(m.telefono)}">
        </div>
      </div>
    </div>

    <!-- Sitios turísticos -->
    <div class="card">
      <div class="card-title"><span>📍</span> Sitios turísticos</div>
      ${[0,1,2,3,4].map(i => `
      <div class="field">
        <label>Sitio ${i+1}${i === 0 ? ' (principal)' : ''}</label>
        <input type="text" name="sitio_${i}" placeholder="${i === 0 ? 'Ej: Iglesia de San Antonio' : 'Opcional'}" value="${sitios[i] || ''}">
      </div>`).join('')}
      <div class="note">Ingrese los atractivos más representativos: parques, iglesias, ríos, monumentos, etc.</div>
    </div>

    <!-- Hoteles -->
    <div class="card">
      <div class="card-title"><span>🏨</span> Alojamiento</div>
      ${[0,1,2].map(i => `
      <div class="hotel-group">
        <div class="hotel-group-label">Hotel / Hospedaje ${i+1}${i === 0 ? '' : ' (opcional)'}</div>
        <div class="field-row">
          <div class="field">
            <label>Nombre</label>
            <input type="text" name="hotel_nombre_${i}" placeholder="Nombre del hotel" value="${hoteles[i] || ''}">
          </div>
          <div class="field">
            <label>WhatsApp / Teléfono</label>
            <input type="tel" name="hotel_tel_${i}" placeholder="+57 300 000 0000" value="${contactos[i] || ''}">
          </div>
        </div>
      </div>`).join('')}
      <div class="note">Esta información ayuda a los visitantes a planear su estadía.</div>
    </div>

    <!-- Nuevos festivales -->
    <div class="card">
      <div class="card-title"><span>🎉</span> Proponer festivales adicionales</div>
      <div class="note" style="margin-bottom:16px">¿Hay festivales de su municipio que no aparecen en FestQuest? Agréguelos aquí y los verificaremos.</div>
      <div id="festivalesNuevos"></div>
      <button type="button" class="btn-add" onclick="agregarFestival()">+ Agregar festival</button>
    </div>

    <button type="submit" class="btn-submit" id="btnEnviar">
      Guardar información del municipio
    </button>
  </form>

</div>

<script>
  let festivalCount = 0;

  function agregarFestival() {
    const container = document.getElementById('festivalesNuevos');
    const idx = festivalCount++;
    const div = document.createElement('div');
    div.className = 'festival-nuevo';
    div.id = 'festival_' + idx;
    div.innerHTML = \`
      <button type="button" class="btn-remove" onclick="document.getElementById('festival_\${idx}').remove()">✕</button>
      <div class="festival-nuevo-label">Festival nuevo \${idx + 1}</div>
      <div class="field">
        <label>Nombre del festival</label>
        <input type="text" name="fest_nombre_\${idx}" placeholder="Ej: Festival del Folclor Vallenato">
      </div>
      <div class="field-row">
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
        <input type="text" name="fest_desc_\${idx}" placeholder="Tipo de festival, tradición, etc.">
      </div>
    \`;
    container.appendChild(div);
  }

  document.getElementById('municipioForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnEnviar');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const fd = new FormData(this);
    const data = Object.fromEntries(fd.entries());

    const sitios = [0,1,2,3,4].map(i => (data['sitio_' + i] || '').trim()).filter(Boolean).join('|');
    const hoteles = [0,1,2].map(i => (data['hotel_nombre_' + i] || '').trim()).filter(Boolean).join('|');
    const contactos = [0,1,2].map(i => (data['hotel_tel_' + i] || '').trim()).filter(Boolean).join('|');

    // Recopilar festivales nuevos
    const festivalesNuevos = [];
    for (let i = 0; i < festivalCount; i++) {
      const el = document.getElementById('festival_' + i);
      if (!el) continue;
      const nombre = (data['fest_nombre_' + i] || '').trim();
      if (!nombre) continue;
      festivalesNuevos.push({
        nombre,
        fecha_inicio: data['fest_inicio_' + i] || null,
        fecha_fin: data['fest_fin_' + i] || null,
        descripcion: data['fest_desc_' + i] || null
      });
    }

    const payload = {
      token: data.token,
      alcalde: data.alcalde || null,
      correo_alcalde: data.correo_alcalde || null,
      telefono: data.telefono || null,
      descripcion: data.descripcion || null,
      gentilicio: data.gentilicio || null,
      habitantes: data.habitantes || null,
      altura: data.altura || null,
      temperatura_promedio: data.temperatura_promedio || null,
      subregion: data.subregion || null,
      sitios_turisticos: sitios || null,
      hoteles: hoteles || null,
      contacto_hoteles: contactos || null,
      festivales_nuevos: festivalesNuevos
    };

    try {
      const res = await fetch('/api/municipio/' + data.municipio_id + '/actualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.ok) {
        document.getElementById('success').style.display = 'block';
        document.getElementById('municipioForm').style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(json.error || 'Error desconocido');
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Guardar información del municipio';
      alert('Error al guardar: ' + err.message + '. Intente de nuevo.');
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
  const {
    token, alcalde, correo_alcalde, telefono, descripcion,
    gentilicio, habitantes, altura, temperatura_promedio, subregion,
    sitios_turisticos, hoteles, contacto_hoteles, festivales_nuevos
  } = req.body;

  if (!token) return res.status(400).json({ ok: false, error: 'Token requerido' });

  try {
    const { rows } = await pool.query(
      'SELECT id FROM municipalities WHERE id = $1 AND token_edicion = $2',
      [id, token]
    );
    if (!rows.length) return res.status(403).json({ ok: false, error: 'Token inválido' });

    await pool.query(
      `UPDATE municipalities SET
        alcalde = COALESCE($1, alcalde),
        correo_alcalde = COALESCE($2, correo_alcalde),
        telefono = COALESCE($3, telefono),
        descripcion = COALESCE($4, descripcion),
        gentilicio = COALESCE($5, gentilicio),
        habitantes = COALESCE($6::integer, habitantes),
        altura = COALESCE($7::integer, altura),
        temperatura_promedio = COALESCE($8::numeric, temperatura_promedio),
        subregion = COALESCE($9, subregion),
        sitios_turisticos = COALESCE($10, sitios_turisticos),
        hoteles = COALESCE($11, hoteles),
        contacto_hoteles = COALESCE($12, contacto_hoteles),
        fecha_actualizacion = NOW()
       WHERE id = $13`,
      [
        alcalde, correo_alcalde, telefono, descripcion,
        gentilicio, habitantes || null, altura || null,
        temperatura_promedio || null, subregion,
        sitios_turisticos, hoteles, contacto_hoteles, id
      ]
    );

    // Insertar festivales nuevos como pendientes de verificación
    if (festivales_nuevos && festivales_nuevos.length > 0) {
      for (const f of festivales_nuevos) {
        if (!f.nombre) continue;
        await pool.query(
          `INSERT INTO festivals (nombre, municipio_id, fecha_inicio, fecha_fin, descripcion, verificado)
           VALUES ($1, $2, $3::date, $4::date, $5, false)
           ON CONFLICT DO NOTHING`,
          [f.nombre, id, f.fecha_inicio || null, f.fecha_fin || null, f.descripcion || null]
        ).catch(() => {
          // Si la columna verificado no existe, insertar sin ella
          return pool.query(
            `INSERT INTO festivals (nombre, municipio_id, fecha_inicio, fecha_fin, descripcion)
             VALUES ($1, $2, $3::date, $4::date, $5)`,
            [f.nombre, id, f.fecha_inicio || null, f.fecha_fin || null, f.descripcion || null]
          );
        });
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
        (m.alcalde IS NOT NULL AND m.alcalde != '') AS tiene_alcalde,
        (m.sitios_turisticos IS NOT NULL AND m.sitios_turisticos != '') AS tiene_sitios,
        (m.hoteles IS NOT NULL AND m.hoteles != '') AS tiene_hoteles,
        (m.descripcion IS NOT NULL AND m.descripcion != '') AS tiene_descripcion,
        COUNT(f.id) AS num_festivales
      FROM municipalities m
      JOIN festivals f ON f.municipio_id = m.id
      WHERE m.token_edicion IS NOT NULL
      GROUP BY m.id
      ORDER BY m.fecha_actualizacion DESC NULLS LAST, num_festivales DESC
    `);
    res.json({ total: rows.length, completados: rows.filter(r => r.tiene_alcalde && r.tiene_sitios).length, municipios: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function htmlError(msg) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:sans-serif;background:#0d0d1a;color:#f0f0f0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}
    .box{background:#13131f;border:1px solid #ff6b35;border-radius:16px;padding:32px;max-width:400px;text-align:center;}
    h2{color:#ff6b35;margin-bottom:12px;}p{color:#888;font-size:0.9rem;}
  </style></head><body><div class="box"><h2>FestQuest</h2><p>${msg}</p></div></body></html>`;
}

module.exports = router;