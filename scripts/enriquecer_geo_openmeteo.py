import pandas as pd
import requests
import time
import re
import unicodedata
from pathlib import Path

INPUT = "data/datos_nacionales_base.csv"
OUTPUT = "data/datos_nacionales_geo.csv"

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"

# Pausa entre consultas para no saturar el servicio
PAUSA_SEGUNDOS = 0.35


def normalizar_texto(texto):
    if pd.isna(texto):
        return ""
    texto = str(texto).strip().lower()
    texto = "".join(
        c for c in unicodedata.normalize("NFD", texto)
        if unicodedata.category(c) != "Mn"
    )
    texto = re.sub(r"\s+", " ", texto)
    return texto


def limpiar_codigo(valor):
    if pd.isna(valor):
        return ""
    s = str(valor).replace(".0", "").strip()
    s = re.sub(r"\D", "", s)
    return s.zfill(5) if s else ""


def buscar_municipio_openmeteo(municipio, departamento):
    """
    Busca un municipio colombiano en Open-Meteo Geocoding.
    Devuelve dict con latitud, longitud, altura y habitantes si encuentra match razonable.
    """
    query = f"{municipio}, {departamento}, Colombia"

    params = {
        "name": query,
        "count": 10,
        "language": "es",
        "format": "json",
    }

    try:
        r = requests.get(GEOCODING_URL, params=params, timeout=45)
        r.raise_for_status()
        data = r.json()
    except Exception:
        return None

    resultados = data.get("results", [])
    if not resultados:
        return None

    municipio_norm = normalizar_texto(municipio)
    departamento_norm = normalizar_texto(departamento)

    # 1) Intento exacto por nombre + admin1/country
    for item in resultados:
        name = normalizar_texto(item.get("name", ""))
        admin1 = normalizar_texto(item.get("admin1", ""))
        country_code = str(item.get("country_code", "")).upper()

        if (
            country_code == "CO"
            and name == municipio_norm
            and (departamento_norm in admin1 or admin1 in departamento_norm or admin1 == "")
        ):
            return {
                "latitud": item.get("latitude"),
                "longitud": item.get("longitude"),
                "altura": item.get("elevation"),
                "habitantes": item.get("population"),
                "fuente_geo": "open-meteo-geocoding",
            }

    # 2) Fallback: primer resultado colombiano con nombre exacto
    for item in resultados:
        name = normalizar_texto(item.get("name", ""))
        country_code = str(item.get("country_code", "")).upper()

        if country_code == "CO" and name == municipio_norm:
            return {
                "latitud": item.get("latitude"),
                "longitud": item.get("longitude"),
                "altura": item.get("elevation"),
                "habitantes": item.get("population"),
                "fuente_geo": "open-meteo-geocoding",
            }

    return None


def main():
    if not Path(INPUT).exists():
        raise FileNotFoundError(f"No existe el archivo: {INPUT}")

    print("Cargando base...")
    df = pd.read_csv(INPUT, encoding="utf-8-sig")

    # Normalizar columnas mínimas
    df["Codigo_id"] = df["Codigo_id"].apply(limpiar_codigo)
    df["departamento"] = df["departamento"].fillna("").astype(str).str.strip()
    df["municipio"] = df["municipio"].fillna("").astype(str).str.strip()

    # Crear columnas nuevas si no existen
    columnas_nuevas = ["latitud", "longitud", "fuente_geo"]
    for col in columnas_nuevas:
        if col not in df.columns:
            df[col] = None

    # Contadores
    completados = 0
    revisados = 0

    for i, row in df.iterrows():
        municipio = row["municipio"]
        departamento = row["departamento"]
        codigo = row["Codigo_id"]

        # Saltar filas claramente inválidas
        if not codigo or not municipio or not departamento:
            continue

        # Si ya tiene todo, saltar
        ya_tiene_lat = pd.notna(row.get("latitud"))
        ya_tiene_lng = pd.notna(row.get("longitud"))
        ya_tiene_altura = pd.notna(row.get("altura"))
        ya_tiene_habitantes = pd.notna(row.get("habitantes"))

        if ya_tiene_lat and ya_tiene_lng and ya_tiene_altura and ya_tiene_habitantes:
            continue

        revisados += 1
        resultado = buscar_municipio_openmeteo(municipio, departamento)

        if resultado:
            if pd.isna(row.get("latitud")) and resultado["latitud"] is not None:
                df.at[i, "latitud"] = resultado["latitud"]

            if pd.isna(row.get("longitud")) and resultado["longitud"] is not None:
                df.at[i, "longitud"] = resultado["longitud"]

            if pd.isna(row.get("altura")) and resultado["altura"] is not None:
                df.at[i, "altura"] = resultado["altura"]

            if pd.isna(row.get("habitantes")) and resultado["habitantes"] is not None:
                df.at[i, "habitantes"] = int(resultado["habitantes"])

            df.at[i, "fuente_geo"] = resultado["fuente_geo"]
            completados += 1

        if revisados % 50 == 0:
            print(f"Revisados: {revisados} | Completados: {completados}")

        time.sleep(PAUSA_SEGUNDOS)

    df.to_csv(OUTPUT, index=False, encoding="utf-8-sig")

    print("")
    print("Proceso terminado.")
    print(f"Revisados: {revisados}")
    print(f"Completados: {completados}")
    print(f"Archivo generado: {OUTPUT}")


if __name__ == "__main__":
    main()