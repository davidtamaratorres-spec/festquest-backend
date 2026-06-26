import psycopg2, os, json, time, requests, anthropic
from dotenv import load_dotenv
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
OUT_DIR = "./output"
LOG_DIR = "./logs"
os.makedirs(LOG_DIR, exist_ok=True)
client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
def conectar():
    return psycopg2.connect(DB_URL)
def buscar_imagen_wikimedia(festival_name, municipio, departamento):
    headers = {"User-Agent":"FestQuestBot/1.0 (gerencia@festquest.app)"}
    queries = [f"{festival_name} {municipio}",f"{festival_name} Colombia"]
    for q in queries:
        try:
            r = requests.get("https://commons.wikimedia.org/w/api.php",params={"action":"query","list":"search","srsearch":q,"srnamespace":"6","srlimit":"3","format":"json"},headers=headers,timeout=10)
            if r.status_code==200:
                results = r.json().get("query",{}).get("search",[])
                for res in results:
                    title = res["title"]
                    if any(ext in title.lower() for ext in [".jpg",".jpeg",".png"]):
                        r2 = requests.get("https://commons.wikimedia.org/w/api.php",params={"action":"query","titles":title,"prop":"imageinfo","iiprop":"url","format":"json"},headers=headers,timeout=10)
                        if r2.status_code==200:
                            pages = r2.json().get("query",{}).get("pages",{})
                            for pg in pages.values():
                                info = pg.get("imageinfo",[])
                                if info:
                                    url = info[0]["url"]
                                    rv = requests.head(url,timeout=8)
                                    if rv.status_code==200 and int(rv.headers.get("content-length",0))>5000:
                                        return url
            time.sleep(0.5)
        except Exception:
            continue
    return None
def generar_descripcion(name, muni, dept, start, end):
    try:
        msg = client.messages.create(model="claude-sonnet-4-6",max_tokens=400,messages=[{"role":"user","content":f"Escribe una descripción atractiva de máximo 150 palabras para el festival colombiano '{name}' del municipio de {muni}, {dept}. Fechas: {start} a {end}. Tono festivo y turístico. Solo la descripción, sin títulos."}])
        return msg.content[0].text.strip()
    except Exception:
        return None
def enriquecer():
    conn = conectar()
    cur = conn.cursor()
    print("ENRIQUECIMIENTO DE FESTIVALES")
    with open(f"{OUT_DIR}/festivales_seleccionados.json",encoding="utf-8") as f:
        festivales = json.load(f)
    actualizados = 0
    for fest in festivales:
        cur.execute("SELECT id,nombre,departamento,municipio,fecha_inicio,fecha_fin,descripcion,foto_url,maps_link FROM festivals WHERE id=%s",(fest["id"],))
        row = cur.fetchone()
        if not row: continue
        _,name,dept,muni,start,end,desc,img,maps = row
        updates = {}
        if not desc or len(str(desc))<50:
            nd = generar_descripcion(name,muni,dept,start,end)
            if nd: updates["descripcion"]=nd
            time.sleep(0.3)
        if not img:
            ni = buscar_imagen_wikimedia(name,muni,dept)
            if ni: updates["foto_url"]=ni
        if not maps:
            q = f"{name}+{muni}+{dept}+Colombia".replace(" ","+")
            updates["maps_link"]=f"https://www.google.com/maps/search/?api=1&query={q}"
        if updates:
            set_clause = ", ".join([f"{k}=%s" for k in updates])
            cur.execute(f"UPDATE festivals SET {set_clause} WHERE id=%s",list(updates.values())+[fest["id"]])
            conn.commit()
            actualizados+=1
    print(f"Festivales actualizados: {actualizados}")
    cur.close()
    conn.close()
if __name__=="__main__":
    enriquecer()
