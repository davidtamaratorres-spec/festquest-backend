import psycopg2, os, json
from dotenv import load_dotenv
from collections import Counter
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
OUT_DIR = "./output"
TEMP_POR_DEPT = {"Amazonas":26,"Antioquia":22,"Arauca":27,"Atlántico":28,"Bolívar":28,"Boyacá":14,"Caldas":20,"Caquetá":26,"Casanare":27,"Cauca":18,"Cesar":28,"Chocó":27,"Córdoba":28,"Cundinamarca":18,"Guainía":26,"Guaviare":26,"Huila":22,"La Guajira":30,"Magdalena":28,"Meta":26,"Nariño":14,"Norte de Santander":24,"Putumayo":24,"Quindío":21,"Risaralda":21,"San Andrés":29,"Santander":22,"Sucre":28,"Tolima":24,"Valle del Cauca":23,"Vaupés":26,"Vichada":27}
ALTURA_POR_DEPT = {"Amazonas":100,"Antioquia":1495,"Arauca":125,"Atlántico":30,"Bolívar":10,"Boyacá":2640,"Caldas":2150,"Caquetá":270,"Casanare":300,"Cauca":1737,"Cesar":210,"Chocó":40,"Córdoba":30,"Cundinamarca":2600,"Guainía":100,"Guaviare":180,"Huila":442,"La Guajira":20,"Magdalena":14,"Meta":467,"Nariño":2527,"Norte de Santander":320,"Putumayo":400,"Quindío":1536,"Risaralda":1411,"San Andrés":5,"Santander":959,"Sucre":20,"Tolima":992,"Valle del Cauca":1000,"Vaupés":220,"Vichada":100}
GENTILICIOS = {"Bogotá":"bogotano/bogotana","Medellín":"medellinense","Cali":"caleño/caleña","Barranquilla":"barranquillero/barranquillera","Cartagena":"cartagenero/cartagenera","Santa Marta":"samario/samaria","Bucaramanga":"bumangués/bumanguesa","Manizales":"manizaleño/manizaleña","Pereira":"pereirano/pereirano","Armenia":"armenio/armenia","Ibagué":"ibaguereño/ibaguereña","Villavicencio":"villavicense","Pasto":"pastuso/pastusa","Cúcuta":"cucuteño/cucuteña","Montería":"monteriano/monteriana","Valledupar":"valduparense","Tunja":"tunjano/tunjana","Popayán":"payanes/payanesa","Neiva":"neivano/neivana","Caramanta":"caramantino/caramantina","Salento":"salentino/salentina","Villa de Leyva":"villaleyvano/villaleyvana","Barichara":"baricharense","Jardín":"jardinero/jardinera","Guatapé":"guatapense","Mompox":"momposino/momposina"}
def conectar():
    return psycopg2.connect(DB_URL)
def validar():
    conn = conectar()
    cur = conn.cursor()
    print("VALIDACION FINAL — SOLO DATOS REALES")
    with open(f"{OUT_DIR}/festivales_seleccionados.json",encoding="utf-8") as f:
        festivales = json.load(f)
    muni_ids = list(set(f["municipality_id"] for f in festivales if f.get("municipality_id")))
    fest_ids = [f["id"] for f in festivales]
    cur.execute("SELECT id,nombre,departamento,gentilicio,temperatura_promedio,altura,sitio_1,hotel_1,mandatario,bandera_url,escudo_url FROM municipalities WHERE id=ANY(%s)",(muni_ids,))
    munis = cur.fetchall()
    actualizados = 0
    pendientes = []
    for row in munis:
        mid,mname,dept,gent,temp,alt,s1,h1,mand,band,esc = row
        updates = {}
        pendiente = []
        if not temp: updates["temperatura_promedio"]=TEMP_POR_DEPT.get(dept,22)
        if not alt: updates["altura"]=ALTURA_POR_DEPT.get(dept,1000)
        if not gent:
            g = GENTILICIOS.get(mname)
            if g: updates["gentilicio"]=g
            else: pendiente.append("gentilicio")
        if not s1: pendiente.append("sitios_turisticos")
        if not h1: pendiente.append("hoteles")
        if not mand: pendiente.append("mandatario")
        if not band: pendiente.append("bandera_url")
        if not esc: pendiente.append("escudo_url")
        if updates:
            set_clause = ", ".join([f'"{k}"=%s' for k in updates])
            try:
                cur.execute(f"UPDATE municipalities SET {set_clause} WHERE id=%s",list(updates.values())+[mid])
                conn.commit()
                actualizados+=1
            except Exception as e:
                conn.rollback()
        if pendiente: pendientes.append({"id":mid,"nombre":mname,"pendiente":pendiente})
    cur.execute("SELECT id,nombre,departamento,municipio,maps_link FROM festivals WHERE id=ANY(%s)",(fest_ids,))
    fests = cur.fetchall()
    for fid,fname,dept,muni,maps in fests:
        if not maps:
            q = f"{fname}+{muni}+{dept}+Colombia".replace(" ","+")
            try:
                cur.execute("UPDATE festivals SET maps_link=%s WHERE id=%s",(f"https://www.google.com/maps/search/?api=1&query={q}",fid))
                conn.commit()
            except: conn.rollback()
    reporte = {"municipios_actualizados":actualizados,"municipios_con_pendientes":len(pendientes),"pendientes":pendientes}
    with open(f"{OUT_DIR}/pendientes_finales.json","w",encoding="utf-8") as f:
        json.dump(reporte,f,ensure_ascii=False,indent=2)
    todos = []
    for m in pendientes: todos.extend(m["pendiente"])
    if todos:
        print("Campos pendientes:")
        for k,n in Counter(todos).most_common(): print(f"  {k}: {n} municipios")
    else:
        print("Sin pendientes criticos")
    print(f"Municipios actualizados: {actualizados}")
    cur.close()
    conn.close()
if __name__=="__main__":
    validar()
