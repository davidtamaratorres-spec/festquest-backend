import pandas as pd
import requests
import time

INPUT = "data/datos_nacionales_geo.csv"
OUTPUT = "data/datos_nacionales_clima.csv"

API = "https://archive-api.open-meteo.com/v1/archive"


def obtener_temperatura(lat, lon):
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": "2022-01-01",
        "end_date": "2022-12-31",
        "daily": "temperature_2m_mean",
        "timezone": "auto",
    }

    try:
        r = requests.get(API, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()

        if "daily" not in data:
            return None

        temps = data["daily"].get("temperature_2m_mean", [])
        temps = [t for t in temps if t is not None]

        if not temps:
            return None

        return sum(temps) / len(temps)

    except Exception:
        return None


def main():
    print("Cargando archivo geográfico...")
    df = pd.read_csv(INPUT, encoding="utf-8-sig")

    # Convertir columnas a numéricas para evitar errores de tipo
    df["temperatura_promedio"] = pd.to_numeric(df["temperatura_promedio"], errors="coerce")
    df["latitud"] = pd.to_numeric(df["latitud"], errors="coerce")
    df["longitud"] = pd.to_numeric(df["longitud"], errors="coerce")

    completados = 0
    revisados = 0

    for i, row in df.iterrows():
        # Saltar si ya tiene temperatura válida (> 0)
        if pd.notna(row["temperatura_promedio"]) and row["temperatura_promedio"] > 0:
            continue

        lat = row["latitud"]
        lon = row["longitud"]

        if pd.isna(lat) or pd.isna(lon):
            continue

        revisados += 1
        temp = obtener_temperatura(lat, lon)

        if temp is not None:
            df.at[i, "temperatura_promedio"] = round(temp, 1)
            completados += 1

        if revisados % 50 == 0:
            print(f"Revisados: {revisados} | Temperaturas calculadas: {completados}")

        time.sleep(0.2)

    df.to_csv(OUTPUT, index=False, encoding="utf-8-sig")

    print("")
    print("Proceso terminado.")
    print(f"Temperaturas calculadas: {completados}")
    print(f"Archivo generado: {OUTPUT}")


if __name__ == "__main__":
    main()