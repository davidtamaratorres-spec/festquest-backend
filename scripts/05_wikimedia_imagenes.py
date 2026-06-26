import psycopg2, os, json, asyncio, aiohttp
from dotenv import load_dotenv
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
HEADERS = {"User-Agent":"FestQuestBot/1.0 (gerencia@festquest.app)"}
MIN_SIZE = 800
CONCURRENCY = 8

def conectar():
    return psycopg2.connect(DB_URL)

async def validar_imagen(session, url):
    try:
        async with session.head(url, allow_redirects=True, timeout=aiohttp.ClientTimeout(total=10)) as r:
            return r.status==200 and int(r.headers.get("content-length",0))>MIN_SIZE
    except: return False

async def get_image_url(session, title):
    try:
        async with session.get("https://commons.wikimedia.org/w/api.php",
            params={"action":"query","titles":title,"prop":"imageinfo","iiprop":"url","format":"json"},
            timeout=aiohttp.ClientTimeout(total=12)) as r:
            if r.status==200:
                pages = (await r.json()).get("query",{}).get("pages",{})
                for pg in pages.values():
                    info = pg.get("imageinfo",[])
                    if info:
                        url = info[0]["url"]
                        if await validar_imagen(session, url): return url
    except: pass
    return None

async def buscar_wikimedia(session, nombre, tipo):
    prefijos = {"Bandera":["Bandera de","Flag of"],"Escudo":["Escudo de","Coat of arms of"]}
    for prefijo in prefijos[tipo]:
        try:
            async with session.get("https://commons.wikimedia.org/w/api.php",
                params={"action":"query","list":"search","srsearch":f"{prefijo} {nombre}","srnamespace":"6","srlimit":"5","format":"json"},
                timeout=aiohttp.ClientTimeout(total=12)) as r:
                if r.status==200:
                    results = (await r.json()).get("query",{}).get("search",[])
                    for res in results:
                        title = res["title"]
                        if nombre.lower() in title.lower() or nombre.lower().replace(" ","_") in title.lower():
                            url = await get_image_url(session, title)
                            if url: return url
        except: continue
    return None

async def procesar_municipio(session, sem, row):
    mid,nombre,dept,bandera,escudo = row
    updates = {}
    async with sem:
        if not bandera:
            url = await buscar_wikimedia(session, nombre, "Bandera")
            if url: updates["bandera_url"]=url
        if not escudo:
            url = await buscar_wikimedia(session, nombre, "Escudo")
            if url: updates["escudo_url"]=url
    return mid, nombre, updates

async def run(municipios):
    sem = asyncio.Semaphore(CONCURRENCY)
    conn = aiohttp.TCPConnector(limit=CONCURRENCY)
    async with aiohttp.ClientSession(headers=HEADERS, connector=conn) as session:
        tasks = [procesar_municipio(session, sem, row) for row in municipios]
        return await asyncio.gather(*tasks)

def procesar():
    conn = conectar()
    cur = conn.cursor()
    print("WIKIMEDIA — BANDERAS Y ESCUDOS (async)")
    cur.execute("SELECT m.id,m.nombre,m.departamento,m.bandera_url,m.escudo_url FROM municipalities m WHERE m.id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL) AND (m.bandera_url IS NULL OR m.bandera_url='' OR m.escudo_url IS NULL OR m.escudo_url='') ORDER BY m.departamento,m.nombre")
    municipios = cur.fetchall()
    print(f"Municipios a procesar: {len(municipios)}")
    resultados = asyncio.run(run(municipios))
    actualizados = 0
    for mid,nombre,updates in resultados:
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
