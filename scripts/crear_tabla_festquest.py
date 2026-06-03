import pandas as pd

INPUT = "data/municipios_colombia_limpio.csv"
OUTPUT = "data/datos_nacionales_base.csv"

df = pd.read_csv(INPUT, encoding="utf-8-sig")

# columnas finales de FestQuest
columnas = [
    "Codigo_id",
    "departamento",
    "municipio",
    "Subregion",
    "habitantes",
    "temperatura_promedio",
    "altura",
    "festival",
    "fecha",
    "sitio_1",
    "maps_1",
    "sitio_2",
    "maps_2",
    "sitio_3",
    "maps_3",
    "hotel_1",
    "wa_1",
    "hotel_2",
    "wa_2",
    "hotel_3",
    "wa_3"
]

# crear columnas faltantes
for col in columnas:
    if col not in df.columns:
        df[col] = None

df = df[columnas]

df.to_csv(OUTPUT, index=False)

print("Filas creadas:", len(df))
print("Archivo base creado:", OUTPUT)