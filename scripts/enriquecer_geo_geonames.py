import pandas as pd
import re
import unicodedata
from pathlib import Path

INPUT_BASE = "data/datos_nacionales_base.csv"
INPUT_GEONAMES = "data/CO.txt"
OUTPUT = "data/datos_nacionales_geo.csv"


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


def cargar_geonames():
    """
    Formato estándar GeoNames:
    0 geonameid
    1 name
    2 asciiname
    3 alternatenames
    4 latitude
    5 longitude
    6 feature class
    7 feature code
    8 country code
    9 cc2
    10 admin1 code
    11 admin2 code
    12 admin3 code
    13 admin4 code
    14 population
    15 elevation
    16 dem
    17 timezone
    18 modification date
    """
    cols = [
        "geonameid", "name", "asciiname", "alternatenames",
        "latitude", "longitude", "feature_class", "feature_code",
        "country_code", "cc2", "admin1_code", "admin2_code",
        "admin3_code", "admin4_code", "population", "elevation",
        "dem", "timezone", "modification_date"
    ]

    df = pd.read_csv(
        INPUT_GEONAMES,
        sep="\t",
        header=None,
        names=cols,
        encoding="utf-8",
        low_memory=False
    )

    # Solo Colombia
    df = df[df["country_code"] == "CO"].copy()

    # Nos interesan sobre todo entidades pobladas / administrativas
    feature_validas = {"P", "A"}
    df = df[df["feature_class"].isin(feature_validas)].copy()

    # Normalizar nombres
    df["name_norm"] = df["name"].apply(normalizar_texto)
    df["asciiname_norm"] = df["asciiname"].apply(normalizar_texto)

    # Convertir campos numéricos
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df["population"] = pd.to_numeric(df["population"], errors="coerce")
    df["elevation"] = pd.to_numeric(df["elevation"], errors="coerce")
    df["dem"] = pd.to_numeric(df["dem"], errors="coerce")

    return df


def elegir_mejor_match(municipio, candidatos):
    """
    Elige el mejor candidato:
    1. nombre exacto
    2. asciiname exacto
    3. mayor población
    """
    municipio_norm = normalizar_texto(municipio)

    exact_name = candidatos[candidatos["name_norm"] == municipio_norm]
    if not exact_name.empty:
        return exact_name.sort_values("population", ascending=False).iloc[0]

    exact_ascii = candidatos[candidatos["asciiname_norm"] == municipio_norm]
    if not exact_ascii.empty:
        return exact_ascii.sort_values("population", ascending=False).iloc[0]

    return candidatos.sort_values("population", ascending=False).iloc[0]


def main():
    if not Path(INPUT_BASE).exists():
        raise FileNotFoundError(f"No existe {INPUT_BASE}")
    if not Path(INPUT_GEONAMES).exists():
        raise FileNotFoundError(f"No existe {INPUT_GEONAMES}")

    print("Cargando base FestQuest...")
    df = pd.read_csv(INPUT_BASE, encoding="utf-8-sig")

    print("Cargando GeoNames Colombia...")
    geo = cargar_geonames()

    # Asegurar columnas destino
    for col in ["latitud", "longitud", "fuente_geo"]:
        if col not in df.columns:
            df[col] = None

    df["Codigo_id"] = df["Codigo_id"].apply(limpiar_codigo)
    df["municipio"] = df["municipio"].fillna("").astype(str).str.strip()
    df["departamento"] = df["departamento"].fillna("").astype(str).str.strip()
    df["municipio_norm"] = df["municipio"].apply(normalizar_texto)

    completados = 0
    sin_match = 0

    for i, row in df.iterrows():
        municipio = row["municipio"]
        municipio_norm = row["municipio_norm"]

        if not municipio_norm:
            sin_match += 1
            continue

        candidatos = geo[
            (geo["name_norm"] == municipio_norm) |
            (geo["asciiname_norm"] == municipio_norm)
        ].copy()

        if candidatos.empty:
            sin_match += 1
            continue

        mejor = elegir_mejor_match(municipio, candidatos)

        if pd.isna(row.get("latitud")) and pd.notna(mejor["latitude"]):
            df.at[i, "latitud"] = mejor["latitude"]

        if pd.isna(row.get("longitud")) and pd.notna(mejor["longitude"]):
            df.at[i, "longitud"] = mejor["longitude"]

        # prioridad elevation; si no existe, usa dem
        altura = mejor["elevation"]
        if pd.isna(altura):
            altura = mejor["dem"]

        if pd.isna(row.get("altura")) and pd.notna(altura):
            df.at[i, "altura"] = int(altura)

        if pd.isna(row.get("habitantes")) and pd.notna(mejor["population"]):
            df.at[i, "habitantes"] = int(mejor["population"])

        df.at[i, "fuente_geo"] = "geonames"
        completados += 1

        if (i + 1) % 100 == 0:
            print(f"Procesados: {i + 1} | Completados: {completados} | Sin match: {sin_match}")

    df = df.drop(columns=["municipio_norm"])
    df.to_csv(OUTPUT, index=False, encoding="utf-8-sig")

    print("")
    print("Proceso terminado.")
    print(f"Completados: {completados}")
    print(f"Sin match: {sin_match}")
    print(f"Archivo generado: {OUTPUT}")


if __name__ == "__main__":
    main()