import psycopg2, os, json, time, re, requests
from dotenv import load_dotenv
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
LOG_DIR = "./logs"
os.makedirs(LOG_DIR, exist_ok=True)
HEADERS = {"User-Agent":"FestQuestBot/1.0 (gerencia@festquest.app)"}
DELAY = 1.2
def conectar():
    return psycopg2.connect(DB_URL)
def buscar_titulo_wikipedia(nombre, departamento):
    for q in [f"{nombre} {departamento}",f"{nombre} Colombia"]:
        try:
            r = requests.get("https://es.wikipedia.org/w/api.php",params={"action":"query","list":"search","srsearch":q,"srlimit":"3","format":"json"},headers=HEADERS,timeout=12)
            if r.status_code==200:
                results = r.json().get("query",{}).get("search",[])
                for res in results:
                    if nombre.lower() in res["title"].lower():
                        return res["title"]
        except Exception:
            pass
        time.sleep(0.5)
    return None
def obtener_wikitext(title):
    try:
        r = requests.get("https://es.wikipedia.org/w/api.php",params={"action":"query","titles":title,"prop":"revisions","rvprop":"content","rvslots":"main","format":"json"},headers=HEADERS,timeout=15)
        if r.status_code==200:
            pages = r.json().get("query",{}).get("pages",{})
            for pg in pages.values():
                revs = pg.get("revisions",[])
                if revs: return revs[0].get("slots",{}).get("main",{}).get("*","")
    except Exception:
        pass
    return ""
def extraer(wikitext,*claves):
    for clave in claves:
        m = re.search(rf'\|\s*{re.escape(clave)}\s*=\s*([^\n\|}}]+)',wikitext,re.IGNORECASE)
        if m:
            v = re.sub(r'\[\[([^\]|]+)(?:\|[^\]]+)?\]\]',r'\1',m.group(1))
            v = re.sub(r'\{\{[^}]+\}\}','',v).strip().strip('|').strip()
            if v: return v
    return None
def extraer_num(texto):
    if not texto: return None
    m = re.search(r'[-+]?\d+(?:[.,]\d+)?',str(texto))
    if m:
        try: return float(m.group().replace(',','.'))
        except: return None
    return None
def procesar():
    conn = conectar()
    cur = conn.cursor()
    print("WIKIPEDIA — DATOS GEOGRAFICOS MUNICIPIOS")
    cur.execute("SELECT m.id,m.nombre,m.departamento,m.gentilicio,m.temperatura_promedio,m.altura FROM municipalities m WHERE m.id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL) AND (m.gentilicio IS NULL OR m.gentilicio='' OR m.temperatura_promedio IS NULL OR m.altura IS NULL) ORDER BY m.departamento,m.nombre")
    municipios = cur.fetchall()
    print(f"Municipios a procesar: {len(municipios)}")
    actualizados = 0
    for mid,nombre,dept,gent,temp,alt in municipios:
        updates = {}
        title = buscar_titulo_wikipedia(nombre,dept)
        time.sleep(DELAY)
        if title:
            wt = obtener_wikitext(title)
            time.sleep(DELAY)
            if wt:
                if not gent:
                    g = extraer(wt,"gentilicio","Gentilicio")
                    if g and len(g)<80: updates["gentilicio"]=g[:100]
                if not temp:
                    tv = extraer_num(extraer(wt,"temperatura","Temperatura","temperatura media"))
                    if tv and -5<=tv<=45: updates["temperatura_promedio"]=tv
                if not alt:
                    av = extraer_num(extraer(wt,"altitud","Altitud","elevación","Elevación"))
                    if av and 0<=av<=5800: updates["altura"]=int(av)
        if updates:
            set_clause = ", ".join([f"{k}=%s" for k in updates])
            cur.execute(f"UPDATE municipalities SET {set_clause} WHERE id=%s",list(updates.values())+[mid])
            conn.commit()
            actualizados+=1
            print(f"  OK {nombre}: {list(updates.keys())}")
    print(f"Municipios actualizados: {actualizados}")
    cur.close()
    conn.close()
if __name__=="__main__":
    procesar()
