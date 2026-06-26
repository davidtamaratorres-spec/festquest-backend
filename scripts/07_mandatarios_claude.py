import psycopg2, os, json, time, re, anthropic
from dotenv import load_dotenv
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
LOG_DIR = "./logs"
os.makedirs(LOG_DIR, exist_ok=True)
client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
DELAY = 1.5
def conectar():
    return psycopg2.connect(DB_URL)
def buscar_mandatario(municipio, departamento):
    prompt = f"""Busca en internet el alcalde o alcaldesa actual de {municipio}, {departamento}, Colombia para el período 2024-2027.
Responde SOLO con JSON válido:
{{"mandatario":"Nombre completo","cargo":"Alcalde","telefono_alcaldia":"numero","confianza":"alta"}}
Si no encuentras: {{"mandatario":null,"cargo":null,"telefono_alcaldia":null,"confianza":"sin_datos"}}"""
    try:
        msg = client.messages.create(model="claude-sonnet-4-6",max_tokens=300,tools=[{"type":"web_search_20250305","name":"web_search"}],messages=[{"role":"user","content":prompt}])
        texto = ""
        for block in msg.content:
            if hasattr(block,"text"): texto = block.text
        texto = re.sub(r"```json\s*","",texto.strip())
        texto = re.sub(r"```\s*","",texto)
        return json.loads(texto)
    except Exception as e:
        m = re.search(r'\{.*?\}',texto if 'texto' in dir() else "",re.DOTALL)
        if m:
            try: return json.loads(m.group())
            except: pass
    return {"mandatario":None,"cargo":None,"telefono_alcaldia":None,"confianza":"error"}
def procesar():
    conn = conectar()
    cur = conn.cursor()
    print("MANDATARIOS — CLAUDE + WEB SEARCH")
    cur.execute("SELECT m.id,m.name,m.department FROM municipalities m WHERE m.id IN (SELECT DISTINCT municipality_id FROM festivals WHERE municipality_id IS NOT NULL) AND (m.mandatario IS NULL OR m.mandatario='') ORDER BY m.department,m.name LIMIT 250")
    municipios = cur.fetchall()
    print(f"Municipios a procesar: {len(municipios)}")
    actualizados = 0
    log = []
    for mid,nombre,dept in municipios:
        data = buscar_mandatario(nombre,dept)
        updates = {}
        if data.get("mandatario"): updates["mandatario"]=data["mandatario"][:150]
        if data.get("cargo"): updates["cargo"]=data["cargo"][:80]
        if data.get("telefono_alcaldia"):
            tel = re.sub(r'[^\d+]','',str(data["telefono_alcaldia"]))
            if len(tel)>=7: updates["telefono"]=tel[:20]
        if updates:
            set_clause = ", ".join([f'"{k}"=%s' for k in updates])
            try:
                cur.execute(f"UPDATE municipalities SET {set_clause} WHERE id=%s",list(updates.values())+[mid])
                conn.commit()
                actualizados+=1
                print(f"  OK {nombre}: {data.get('mandatario','')}")
            except Exception as e:
                conn.rollback()
                print(f"  ERROR {nombre}: {e}")
        log.append({"id":mid,"nombre":nombre,"datos":data})
        time.sleep(DELAY)
    with open("./logs/07_mandatarios.json","w",encoding="utf-8") as f:
        json.dump(log,f,ensure_ascii=False,indent=2)
    print(f"Municipios actualizados: {actualizados}")
    cur.close()
    conn.close()
if __name__=="__main__":
    procesar()
