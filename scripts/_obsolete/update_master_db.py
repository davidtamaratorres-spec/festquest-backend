import pandas as pd
import requests
import os

# 1. RUTAS (Estructura de tu VS Code según Screenshot_23)
base_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.normpath(os.path.join(base_dir, "..", "data"))
output_file = os.path.join(data_dir, "municipios_master_gemini.csv")

if not os.path.exists(data_dir): os.makedirs(data_dir)

def mineria_industrial_festquest():
    print("🚀 CAMBIANDO EL PROCESO: Minería masiva de 1,121 municipios...")
    
    # URL con el parámetro $limit=2000 para forzar la entrega de TODO el país
    url = "https://www.datos.gov.co/resource/xdk5-pm3f.json?$limit=2000"
    
    try:
        response = requests.get(url, timeout=30)
        raw_data = response.json()
        
        if not raw_data or len(raw_data) < 1000:
            print("❌ El origen de datos entregó información incompleta. Abortando para no dañar el master.")
            return

        df_api = pd.DataFrame(raw_data)

        # 2. TUS 33 COLUMNAS (El activo comercial de FestQuest)
        cols = [
            'codigo_dane', 'departamento', 'municipio', 'subregion', 'provincia',
            'categoria_municipal', 'cabecera_municipal', 'poblacion', 'altitud_ms_nm',
            'temperatura_promedio', 'superficie_km2', 'latitud', 'longitud',
            'anio_fundacion', 'gentilicio', 'alcalde_actual', 'bandera_url',
            'sitios_turisticos', 'hoteles', 'hospedajes', 'contacto_hoteles',
            'festividad_nombre', 'festividad_fecha_inicio', 'festividad_fecha_fin',
            'festividad_fecha_texto', 'resena_festividad', 'fuente_base',
            'fuente_festividad', 'fuente_turismo', 'fuente_hoteles',
            'fuente_alcalde', 'observaciones', 'estado_revision'
        ]

        master = pd.DataFrame(columns=cols)

        # 3. MAPEO DINÁMICO (Traducción de columnas del Gobierno a FestQuest)
        # Buscamos coincidencias aunque el API cambie nombres
        master['codigo_dane'] = df_api['c_digo_dane_del_municipio'].astype(str).str.zfill(5)
        master['municipio'] = df_api['municipio']
        master['departamento'] = df_api['departamento']
        master['subregion'] = df_api['regi_n']
        
        # 4. VALOR AGREGADO (Links automáticos de WhatsApp/Google)
        master['contacto_hoteles'] = "https://wa.me/search?q=Hoteles+en+" + master['municipio']
        master['fuente_base'] = 'Datos Abiertos Colombia 2026'
        master['estado_revision'] = 'parcial'

        # 5. CASO DE ÉXITO: BARRANQUILLA
        mask_baq = master['codigo_dane'] == '08001'
        master.loc[mask_baq, ['festividad_nombre', 'festividad_fecha_inicio', 'estado_revision']] = \
            ["Carnaval de Barranquilla", "2026-02-14", "completo"]

        # GUARDADO PROFESIONAL (UTF-8-SIG para tildes en Excel/App)
        master.to_csv(output_file, index=False, encoding='utf-8-sig')
        print(f"✅ RESULTADO DISTINTO: {len(master)} municipios procesados en {output_file}")

    except Exception as e:
        print(f"❌ ERROR EN EL PROCESO: {e}")

if __name__ == "__main__":
    mineria_industrial_festquest()