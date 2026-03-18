import pandas as pd

INPUT = "data/datos_nacionales_clima.csv"
OUTPUT = "data/datos_nacionales_subregion.csv"

MAPA_SUBREGION = {
    "Amazonas": "Amazonía",
    "Antioquia": "Antioquia",
    "Arauca": "Orinoquía",
    "Archipiélago De San Andrés": "Caribe",
    "Atlántico": "Caribe",
    "Bogotá, D.C.": "Centro",
    "Bolívar": "Caribe",
    "Boyacá": "Centro",
    "Caldas": "Eje Cafetero",
    "Caquetá": "Amazonía",
    "Casanare": "Orinoquía",
    "Cauca": "Pacífico",
    "Cesar": "Caribe",
    "Chocó": "Pacífico",
    "Córdoba": "Caribe",
    "Cundinamarca": "Centro",
    "Guainía": "Amazonía",
    "Guaviare": "Amazonía",
    "Huila": "Centro",
    "La Guajira": "Caribe",
    "Magdalena": "Caribe",
    "Meta": "Orinoquía",
    "Nariño": "Pacífico",
    "Norte De Santander": "Santanderes",
    "Putumayo": "Amazonía",
    "Quindio": "Eje Cafetero",
    "Quindío": "Eje Cafetero",
    "Risaralda": "Eje Cafetero",
    "Santander": "Santanderes",
    "Sucre": "Caribe",
    "Tolima": "Centro",
    "Valle Del Cauca": "Pacífico",
    "Vaupés": "Amazonía",
    "Vichada": "Orinoquía",
    "Nacional": "Nacional"
}

def main():

    print("Cargando dataset climático...")
    df = pd.read_csv(INPUT, encoding="utf-8-sig")

    # Forzar columna Subregion a texto
    if "Subregion" not in df.columns:
        df["Subregion"] = ""
    else:
        df["Subregion"] = df["Subregion"].astype(str)

    df["departamento"] = df["departamento"].fillna("").astype(str).str.strip()

    asignados = 0
    no_asignados = 0

    for i,row in df.iterrows():

        dep = row["departamento"]

        if dep in MAPA_SUBREGION:
            df.at[i,"Subregion"] = MAPA_SUBREGION[dep]
            asignados += 1
        else:
            no_asignados += 1

    df.to_csv(OUTPUT,index=False,encoding="utf-8-sig")

    print("")
    print("Proceso terminado.")
    print("Subregiones asignadas:",asignados)
    print("Sin asignar:",no_asignados)
    print("Archivo generado:",OUTPUT)

if __name__ == "__main__":
    main()