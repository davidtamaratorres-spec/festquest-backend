import psycopg2, os, json
from dotenv import load_dotenv
from collections import defaultdict
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
OUT_DIR = "./output"
os.makedirs(OUT_DIR, exist_ok=True)
TARGET = 210
def conectar():
    return psycopg2.connect(DB_URL)
def seleccionar():
    conn = conectar()
    cur = conn.cursor()
    print("SELECCION 200+ FESTIVALES 32 DEPARTAMENTOS")
    cur.execute("""SELECT f.id,f.nombre,f.departamento,f.municipio,f.municipio_id,f.fecha_inicio,f.fecha_fin,f.descripcion,f.foto_url,f.maps_link,
        (CASE WHEN m.gentilicio IS NOT NULL AND m.gentilicio!='' THEN 1 ELSE 0 END+CASE WHEN m.temperatura_promedio IS NOT NULL THEN 1 ELSE 0 END+CASE WHEN m.altura IS NOT NULL THEN 1 ELSE 0 END+CASE WHEN m.sitio_1 IS NOT NULL AND m.sitio_1!='' THEN 2 ELSE 0 END+CASE WHEN m.hotel_1 IS NOT NULL AND m.hotel_1!='' THEN 2 ELSE 0 END+CASE WHEN m.mandatario IS NOT NULL AND m.mandatario!='' THEN 1 ELSE 0 END) as score_muni,
        (CASE WHEN f.foto_url IS NOT NULL AND f.foto_url!='' THEN 2 ELSE 0 END+CASE WHEN f.descripcion IS NOT NULL AND LENGTH(f.descripcion)>50 THEN 1 ELSE 0 END+CASE WHEN f.fecha_inicio IS NOT NULL THEN 1 ELSE 0 END) as score_fest
        FROM festivals f LEFT JOIN municipalities m ON m.id=f.municipio_id WHERE f.departamento IS NOT NULL ORDER BY f.departamento,(score_muni+score_fest) DESC""")
    todos = cur.fetchall()
    print(f"Total festivales en BD: {len(todos)}")
    por_dept = defaultdict(list)
    for row in todos:
        if row[2]: por_dept[row[2]].append(row)
    seleccionados = {}
    por_dept_count = defaultdict(int)
    for dept in sorted(por_dept.keys()):
        mejor = por_dept[dept][0]
        seleccionados[mejor[0]] = mejor
        por_dept_count[dept] += 1
        print(f"  {dept}: {mejor[1][:40]}")
    print(f"Fase 1: {len(seleccionados)} festivales")
    depts_grandes = ["Antioquia","Valle del Cauca","Cundinamarca","Bolívar","Nariño","Boyacá","Santander","Atlántico","Córdoba","Meta","Cauca","Tolima","Huila"]
    candidatos = []
    for dept,festivales in por_dept.items():
        for fest in festivales[1:]:
            if fest[0] not in seleccionados:
                candidatos.append((fest[11]+fest[12],dept,fest))
    candidatos.sort(key=lambda x:(-x[0],x[1]))
    for score,dept,fest in candidatos:
        if len(seleccionados)>=TARGET: break
        cap = 10 if dept in depts_grandes else 5
        if por_dept_count[dept]<cap:
            seleccionados[fest[0]]=fest
            por_dept_count[dept]+=1
    print(f"Total seleccionados: {len(seleccionados)}")
    output = []
    for fid,row in seleccionados.items():
        output.append({"id":row[0],"name":row[1],"department":row[2],"municipality":row[3],"municipality_id":row[4],"start_date":str(row[5]) if row[5] else None,"end_date":str(row[6]) if row[6] else None,"description":row[7],"image_url":row[8],"maps_link":row[9],"score_muni":row[11],"score_fest":row[12],"necesita_enriquecimiento":(row[11]+row[12])<10})
    output.sort(key=lambda x:x["department"])
    with open(f"{OUT_DIR}/festivales_seleccionados.json","w",encoding="utf-8") as f:
        json.dump(output,f,ensure_ascii=False,indent=2)
    print(f"Guardado: {OUT_DIR}/festivales_seleccionados.json")
    cur.close()
    conn.close()
if __name__=="__main__":
    seleccionar()
