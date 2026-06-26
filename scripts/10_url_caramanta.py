import psycopg2, os, json, secrets
from dotenv import load_dotenv
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
BASE_URL = os.getenv("BACKEND_URL","https://festquest-backend.onrender.com")
OUT_DIR = "./output"
os.makedirs(OUT_DIR, exist_ok=True)
def conectar():
    return psycopg2.connect(DB_URL)
def generar():
    conn = conectar()
    cur = conn.cursor()
    print("URL VALIDACION CARAMANTA")
    cur.execute("SELECT id,nombre,departamento,slug,token_edicion,gentilicio,temperatura_promedio,altura,sitio_1,hotel_1,mandatario,(SELECT COUNT(*) FROM festivals WHERE municipio_id=id) as nf FROM municipalities WHERE LOWER(nombre) LIKE '%caramanta%' LIMIT 1")
    row = cur.fetchone()
    if not row:
        print("Caramanta no encontrado en BD")
        cur.close()
        conn.close()
        return
    mid,nombre,dept,slug,token,gent,temp,alt,s1,h1,mand,nf = row
    if not slug:
        slug = nombre.lower().replace(" ","-").replace("á","a").replace("é","e").replace("í","i").replace("ó","o").replace("ú","u")
    if not token:
        token = secrets.token_urlsafe(32)
        cur.execute("UPDATE municipalities SET token_edicion=%s WHERE id=%s",(token,mid))
        conn.commit()
        print("Token generado")
    url = f"{BASE_URL}/municipio/{slug}/editar?token={token}"
    url_publica = f"https://festquest.app/municipio/{slug}/editar?token={token}"
    print(f"Municipio: {nombre}, {dept}")
    print(f"Festivales: {nf}")
    print(f"URL formulario: {url}")
    print(f"URL publica: {url_publica}")
    print(f"Datos completos: gentilicio={'SI' if gent else 'NO'}, temp={'SI' if temp else 'NO'}, sitios={'SI' if s1 else 'NO'}, hoteles={'SI' if h1 else 'NO'}, mandatario={'SI' if mand else 'NO'}")
    resultado = {"municipio":nombre,"departamento":dept,"id":mid,"url_formulario":url,"url_publica":url_publica,"token":token,"num_festivales":nf}
    with open(f"{OUT_DIR}/caramanta_validacion.json","w",encoding="utf-8") as f:
        json.dump(resultado,f,ensure_ascii=False,indent=2)
    print(f"Guardado: {OUT_DIR}/caramanta_validacion.json")
    cur.close()
    conn.close()
if __name__=="__main__":
    generar()
