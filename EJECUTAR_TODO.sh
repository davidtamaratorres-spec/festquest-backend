#!/bin/bash
set -e
LOG_DIR="./logs/pipeline"
mkdir -p "$LOG_DIR" "./output"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MASTER_LOG="$LOG_DIR/master_$TIMESTAMP.log"
log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$MASTER_LOG"; }

log "Instalando dependencias..."
python3 -m pip install requests psycopg2-binary anthropic tqdm python-dotenv -q

log "PASO 1 — Auditoría"
python3 scripts/01_auditor.py 2>&1 | tee -a "$MASTER_LOG"
git add -A && git commit -m "data: paso 1 auditor completado"

log "PASO 2 — Selección festivales"
python3 scripts/02_seleccionar_festivales.py 2>&1 | tee -a "$MASTER_LOG"
git add -A && git commit -m "data: paso 2 seleccion completado"

log "PASO 3 — Enriquecer festivales"
python3 scripts/03_enriquecer_festivales.py 2>&1 | tee -a "$MASTER_LOG"
git add -A && git commit -m "data: paso 3 enriquecimiento completado"

log "PASO 4 — Wikipedia municipios"
python3 scripts/04_wikipedia_municipios.py 2>&1 | tee -a "$MASTER_LOG"
git add -A && git commit -m "data: paso 4 wikipedia completado"

log "PASO 5 — Wikimedia imágenes"
python3 scripts/05_wikimedia_imagenes.py 2>&1 | tee -a "$MASTER_LOG"
git add -A && git commit -m "data: paso 5 wikimedia completado"

log "PASO 6 — Google Places"
python3 scripts/06_google_places.py 2>&1 | tee -a "$MASTER_LOG"
git add -A && git commit -m "data: paso 6 places completado"

log "PASO 7 — Mandatarios"
python3 scripts/07_mandatarios_claude.py 2>&1 | tee -a "$MASTER_LOG"
git add -A && git commit -m "data: paso 7 mandatarios completado"

log "PASO 8 — Validación final"
python3 scripts/08_validacion_final.py 2>&1 | tee -a "$MASTER_LOG"
git add -A && git commit -m "data: paso 8 validacion completado"

log "PASO 9 — Backend security check"
node scripts/09_verificar_backend.js 2>&1 | tee -a "$MASTER_LOG"
git add -A && git commit -m "data: paso 9 backend completado"

log "PASO 10 — URL Caramanta"
python3 scripts/10_url_caramanta.py 2>&1 | tee -a "$MASTER_LOG"
git add -A && git commit -m "data: pipeline completo"

log "PIPELINE COMPLETADO"
git push
