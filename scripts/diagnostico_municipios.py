import pandas as pd

ARCHIVO = "data/municipios_de_colombia.csv"

df = pd.read_csv(ARCHIVO, encoding="utf-8-sig")

print("\nTOTAL REGISTROS:")
print(len(df))

# Normalizar Codigo_id solo para diagnóstico
df["Codigo_id"] = (
    df["Codigo_id"]
    .astype(str)
    .str.replace(".0", "", regex=False)
    .str.strip()
)

print("\nCODIGOS DUPLICADOS:")
dup = df[df.duplicated("Codigo_id", keep=False)].sort_values("Codigo_id")
print(dup[["Codigo_id", "departamento", "municipio"]].to_string(index=False))

print("\nTOTAL DUPLICADOS:")
print(dup["Codigo_id"].nunique())

print("\nDEPARTAMENTOS UNICOS:")
deps = sorted(df["departamento"].astype(str).str.strip().unique())
for d in deps:
    print(d)

print("\nTOTAL DEPARTAMENTOS UNICOS:")
print(len(deps))

print("\nREGISTROS CON Codigo_id VACIO:")
vacios = df[df["Codigo_id"].isna() | (df["Codigo_id"] == "")]
print(len(vacios))

print("\nREGISTROS CON MUNICIPIO VACIO:")
mun_vacios = df[df["municipio"].isna() | (df["municipio"].astype(str).str.strip() == "")]
print(len(mun_vacios))