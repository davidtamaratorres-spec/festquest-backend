import psycopg2, os, csv, json
from dotenv import load_dotenv
from datetime import datetime
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
OUT_DIR = "./output"
os.makedirs(OUT_DIR, exist_ok=True)
def conectar():
    return psycopg2.connect(DB_URL)
def auditar():
    conn = conectar()
    cur = conn.cursor()
    print("AUDITOR FESTQUEST")
    cur.execute("SELECT COUNT(*) FROM festivals")
    total_fest = cur.fetchone()[0]
    print(f"Festivales: {total_fest}")
    cur.execute("SELECT COUNT(*) FROM municipalities WHERE id IN (SELECT DISTINCT municipality_id FROM festivals WHERE municipality_id IS NOT NULL)")
    total_munis = cur.fetchone()[0]
    print(f"Municipios con festivales: {total_munis}")
    campos_muni = ["gentilicio","temperatura_promedio","altura_msnm","sitio_1","maps_1","hotel_1","wa_1","mandatario","bandera_url","escudo_url"]
    print("Completitud municipios:")
    muni_stats = {}
    for campo in campos_muni:
        try:
            cur.execute(f"SELECT COUNT(*) FROM municipalities WHERE id IN (SELECT DISTINCT municipality_id FROM festivals WHERE municipality_id IS NOT NULL) AND {campo} IS NOT NULL AND CAST({campo} AS TEXT) NOT IN ('','null','None')")
            ok = cur.fetchone()[0]
            pct = round(ok/total_munis*100,1) if total_munis else 0
            estado = "OK" if pct>=90 else ("PARCIAL" if pct>=40 else "CRITICO")
            print(f"  {estado} {campo}: {ok}/{total_munis} ({pct}%)")
            muni_stats[campo] = {"ok":ok,"total":total_munis,"pct":pct}
        except Exception as e:
            print(f"  ERROR {campo}: {e}")
    cur.execute("SELECT m.id, m.name, m.department, m.gentilicio, m.temperatura_promedio, m.altura_msnm, m.sitio_1, m.hotel_1, m.mandatario, m.bandera_url, m.escudo_url, m.token_edicion, (SELECT COUNT(*) FROM festivals f WHERE f.municipality_id=m.id) as nf FROM municipalities m WHERE m.id IN (SELECT DISTINCT municipality_id FROM festivals WHERE municipality_id IS NOT NULL) ORDER BY nf DESC")
    munis = cur.fetchall()
    with open(f"{OUT_DIR}/auditoria_municipios.csv","w",newline="",encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id","nombre","departamento","num_festivales","tiene_gentilicio","tiene_temperatura","tiene_altura","tiene_sitios","tiene_hoteles","tiene_mandatario","tiene_bandera","tiene_escudo","token_edicion","campos_faltantes"])
        for m in munis:
            mid,mname,dept,gent,temp,alt,s1,h1,mand,band,esc,token,nf = m
            faltantes = []
            if not gent: faltantes.append("gentilicio")
            if not temp: faltantes.append("temperatura")
            if not alt: faltantes.append("altura")
            if not s1: faltantes.append("sitios")
            if not h1: faltantes.append("hoteles")
            if not mand: faltantes.append("mandatario")
            if not band: faltantes.append("bandera")
            if not esc: faltantes.append("escudo")
            w.writerow([mid,mname,dept,nf,bool(gent),bool(temp),bool(alt),bool(s1),bool(h1),bool(mand),bool(band),bool(esc),token or "","|".join(faltantes)])
    resumen = {"timestamp":datetime.now().isoformat(),"festivales":total_fest,"municipios":total_munis,"stats":muni_stats}
    with open(f"{OUT_DIR}/auditoria_resumen.json","w",encoding="utf-8") as f:
        json.dump(resumen,f,ensure_ascii=False,indent=2)
    print(f"Guardado: {OUT_DIR}/auditoria_municipios.csv")
    cur.close()
    conn.close()
if __name__=="__main__":
    auditar()
