import psycopg2, os, json, time, requests
from dotenv import load_dotenv
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
HEADERS = {"User-Agent":"FestQuestBot/1.0 (gerencia@festquest.app)"}
MIN_SIZE = 800
DELAY = 1.0
def conectar():
    return psycopg2.connect(DB_URL)
def validar_imagen(url):
    try:
        r = requests.head(url,headers=HEADERS,timeout=10,allow_redirects=True)
        return r.status_code==200 and int(r.headers.get("content-length",0))>MIN_SIZE
    except: return False
def buscar_wikimedia(nombre, tipo):
    prefijos = {"Bandera":["Bandera de","Flag of"],"Escudo":["Escudo de","Coat of arms of"]}
    for prefijo in prefijos[tipo]:
        try:
            r = requests.get("https://commons.wikimedia.org/w/api.php",params={"action":"query","list":"search","srsearch":f"{prefijo} {nombre}","srnamespace":"6","srlimit":"5","format":"json"},headers=HEADERS,timeout=12)
            if r.status_code==200:
                results = r.json().get("query",{}).get("search",[])
                for res in results:
                    title = res["title"]
                    if nombre.lower() in title.lower() or nombre.lower().replace(" ","_") in title.lower():
                        r2 = requests.get("https://commons.wikimedia.org/w/api.php",params={"action":"query","titles":title,"prop":"imageinfo","iiprop":"url","format":"json"},headers=HEADERS,timeout=12)
                        if r2.status_code==200:
                            pages = r2.json().get("query",{}).get("pages",{})
                            for pg in pages.values():
                                info = pg.get("imageinfo",[])
                                if info:
                                    url = info[0]["url"]
                                    if validar_imagen(url): return url
            time.sleep(DELAY)
        except: continue
    return None
def procesar():
    conn = conectar()
    cur = conn.cursor()
    print("WIKIMEDIA — BANDERAS Y ESCUDOS")
    cur.execute("SELECT m.id,m.nombre,m.departamento,m.bandera_url,m.escudo_url FROM municipalities m WHERE m.id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL) AND (m.bandera_url IS NULL OR m.bandera_url='' OR m.escudo_url IS NULL OR m.escudo_url='') ORDER BY m.departamento,m.nombre")
    municipios = cur.fetchall()
    print(f"Municipios a procesar: {len(municipios)}")
    actualizados = 0
    for mid,nombre,dept,bandera,escudo in municipios:
        updates = {}
        if not bandera:
            url = buscar_wikimedia(nombre,"Bandera")
            if url: updates["bandera_url"]=url
            time.sleep(DELAY)
        if not escudo:
            url = buscar_wikimedia(nombre,"Escudo")
            if url: updates["escudo_url"]=url
            time.sleep(DELAY)
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
