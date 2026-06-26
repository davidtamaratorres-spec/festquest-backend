import psycopg2, os, json, time, requests
from dotenv import load_dotenv
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
PLACES_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
DELAY = 0.6
BASE = "https://maps.googleapis.com/maps/api/place"
def conectar():
    return psycopg2.connect(DB_URL)
def text_search(query, tipo=None):
    params = {"query":query,"key":PLACES_KEY,"language":"es","region":"co"}
    if tipo: params["type"]=tipo
    try:
        r = requests.get(f"{BASE}/textsearch/json",params=params,timeout=15)
        if r.status_code==200: return r.json().get("results",[])
    except: pass
    return []
def place_details(place_id):
    try:
        r = requests.get(f"{BASE}/details/json",params={"place_id":place_id,"key":PLACES_KEY,"fields":"formatted_phone_number,international_phone_number,geometry,name","language":"es"},timeout=12)
        if r.status_code==200: return r.json().get("result",{})
    except: pass
    return {}
def wa(tel):
    if not tel: return None
    d = "".join(filter(str.isdigit,str(tel)))
    if d.startswith("57"): return f"https://wa.me/{d}"
    if d.startswith("3") and len(d)==10: return f"https://wa.me/57{d}"
    return None
def maps_url(lat,lon,name):
    return f"https://www.google.com/maps/search/?api=1&query={lat},{lon}"
def procesar():
    if not PLACES_KEY:
        print("GOOGLE_PLACES_API_KEY no configurada — saltando")
        return
    conn = conectar()
    cur = conn.cursor()
    print("GOOGLE PLACES — SITIOS Y HOTELES")
    cur.execute("SELECT DISTINCT ON (m.id) m.id,m.nombre,m.departamento,m.sitio_1,m.hotel_1 FROM municipalities m WHERE m.id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL) AND (m.sitio_1 IS NULL OR m.sitio_1='' OR m.hotel_1 IS NULL OR m.hotel_1='') ORDER BY m.id")
    municipios = cur.fetchall()
    print(f"Municipios a procesar: {len(municipios)}")
    actualizados = 0
    for mid,nombre,dept,s1,h1 in municipios:
        updates = {}
        if not s1:
            places = text_search(f"atractivos turisticos {nombre} {dept} Colombia")
            vistos = set()
            sitios = []
            for p in places:
                if len(sitios)>=3: break
                pid = p.get("place_id","")
                if pid in vistos: continue
                vistos.add(pid)
                geo = p.get("geometry",{}).get("location",{})
                lat,lon = geo.get("lat"),geo.get("lng")
                if lat and lon:
                    sitios.append({"nombre":p.get("name",""),"maps":maps_url(lat,lon,p.get("name",""))})
                time.sleep(DELAY)
            for i,s in enumerate(sitios,1):
                updates[f"sitio_{i}"]=s["nombre"]
                updates[f"maps_{i}"]=s["maps"]
        if not h1:
            places = text_search(f"hoteles {nombre} {dept} Colombia","lodging")
            vistos = set()
            hoteles = []
            for p in places:
                if len(hoteles)>=3: break
                pid = p.get("place_id","")
                if pid in vistos: continue
                vistos.add(pid)
                det = place_details(pid)
                time.sleep(DELAY)
                tel = det.get("international_phone_number") or det.get("formatted_phone_number")
                geo = p.get("geometry",{}).get("location",{})
                lat,lon = geo.get("lat"),geo.get("lng")
                hoteles.append({"nombre":p.get("name",""),"wa":wa(tel),"maps":maps_url(lat,lon,p.get("name","")) if lat and lon else None})
            for i,h in enumerate(hoteles,1):
                updates[f"hotel_{i}"]=h["nombre"]
                if h.get("wa"): updates[f"wa_{i}"]=h["wa"]
        if updates:
            set_clause = ", ".join([f'"{k}"=%s' for k in updates])
            cur.execute(f"UPDATE municipalities SET {set_clause} WHERE id=%s",list(updates.values())+[mid])
            conn.commit()
            actualizados+=1
            print(f"  OK {nombre}")
        time.sleep(0.3)
    print(f"Municipios actualizados: {actualizados}")
    cur.close()
    conn.close()
if __name__=="__main__":
    procesar()
