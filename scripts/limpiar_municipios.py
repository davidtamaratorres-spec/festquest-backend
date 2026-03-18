import pandas as pd

INPUT = "data/municipios_de_colombia.csv"
OUTPUT = "data/municipios_colombia_limpio.csv"

df = pd.read_csv(INPUT, encoding="utf-8-sig")

# limpiar codigo
df["Codigo_id"] = (
    df["Codigo_id"]
    .astype(str)
    .str.replace(".0", "", regex=False)
    .str.strip()
)

# eliminar filas sin codigo o municipio
df = df[df["Codigo_id"].notna()]
df = df[df["Codigo_id"] != ""]
df = df[df["municipio"].notna()]

# eliminar filas basura del PDF
basura = [
    "INFORMACIÓN",
    "competentes",
    "Corregimiento",
    "CM:",
    "CD:",
    "DANE",
]

for palabra in basura:
    df = df[~df["departamento"].astype(str).str.contains(palabra, case=False, na=False)]

# eliminar duplicados
df = df.drop_duplicates(subset=["Codigo_id"])

# ordenar
df = df.sort_values("Codigo_id")

# guardar limpio
df.to_csv(OUTPUT, index=False)

print("Municipios finales:", len(df))
print("Archivo limpio creado:", OUTPUT)