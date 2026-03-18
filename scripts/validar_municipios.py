import pandas as pd

ARCHIVO = "data/municipios_de_colombia.csv"

print("Cargando archivo...")

df = pd.read_csv(ARCHIVO, encoding="utf-8")

print("")
print("Total registros:", len(df))

print("")
print("Primeros municipios:")
print(df.head())

print("")
print("Municipios duplicados por Codigo_id:")

duplicados = df[df.duplicated("Codigo_id")]
print(len(duplicados))

print("")
print("Departamentos únicos:")
print(df["departamento"].nunique())

print("")
print("Municipios únicos:")
print(df["municipio"].nunique())