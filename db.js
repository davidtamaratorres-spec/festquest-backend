const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const crearTablas = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS municipalities (
      id SERIAL PRIMARY KEY
    );

    ALTER TABLE municipalities
      ADD COLUMN IF NOT EXISTS codigo_dane VARCHAR(5),
      ADD COLUMN IF NOT EXISTS nombre VARCHAR(255),
      ADD COLUMN IF NOT EXISTS departamento VARCHAR(255),
      ADD COLUMN IF NOT EXISTS subregion VARCHAR(255),
      ADD COLUMN IF NOT EXISTS habitantes INTEGER,
      ADD COLUMN IF NOT EXISTS temperatura_promedio NUMERIC,
      ADD COLUMN IF NOT EXISTS altura INTEGER,
      ADD COLUMN IF NOT EXISTS gentilicio VARCHAR(255),
      ADD COLUMN IF NOT EXISTS bandera_url TEXT,
      ADD COLUMN IF NOT EXISTS alcalde VARCHAR(255),
      ADD COLUMN IF NOT EXISTS correo_alcalde VARCHAR(255),
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

    CREATE TABLE IF NOT EXISTS festivals (
      id SERIAL PRIMARY KEY
    );

    ALTER TABLE festivals
      ADD COLUMN IF NOT EXISTS nombre VARCHAR(255),
      ADD COLUMN IF NOT EXISTS fecha VARCHAR(100),
      ADD COLUMN IF NOT EXISTS fecha_inicio DATE,
      ADD COLUMN IF NOT EXISTS fecha_fin DATE,
      ADD COLUMN IF NOT EXISTS descripcion TEXT,
      ADD COLUMN IF NOT EXISTS municipio_id INTEGER REFERENCES municipalities(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS codigo_dane VARCHAR(5),
      ADD COLUMN IF NOT EXISTS lugar_encuentro TEXT,
      ADD COLUMN IF NOT EXISTS maps_link TEXT,
      ADD COLUMN IF NOT EXISTS whatsapp_link TEXT,
      ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

    CREATE TABLE IF NOT EXISTS restaurants (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL
    );

    ALTER TABLE restaurants
      ADD COLUMN IF NOT EXISTS municipio_id INTEGER REFERENCES municipalities(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS codigo_dane VARCHAR(5),
      ADD COLUMN IF NOT EXISTS departamento VARCHAR(255),
      ADD COLUMN IF NOT EXISTS municipio VARCHAR(255),
      ADD COLUMN IF NOT EXISTS ciudad VARCHAR(255),
      ADD COLUMN IF NOT EXISTS direccion TEXT,
      ADD COLUMN IF NOT EXISTS maps_url TEXT,
      ADD COLUMN IF NOT EXISTS whatsapp TEXT,
      ADD COLUMN IF NOT EXISTS telefono TEXT,
      ADD COLUMN IF NOT EXISTS categoria VARCHAR(255),
      ADD COLUMN IF NOT EXISTS imagen_url TEXT,
      ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS fuente TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

    CREATE TABLE IF NOT EXISTS dishes (
      id SERIAL PRIMARY KEY,
      restaurante_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE
    );

    ALTER TABLE dishes
      ADD COLUMN IF NOT EXISTS nombre VARCHAR(255),
      ADD COLUMN IF NOT EXISTS descripcion TEXT,
      ADD COLUMN IF NOT EXISTS precio NUMERIC,
      ADD COLUMN IF NOT EXISTS categoria VARCHAR(255),
      ADD COLUMN IF NOT EXISTS imagen_url TEXT,
      ADD COLUMN IF NOT EXISTS disponible BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS es_tipico BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

    CREATE TABLE IF NOT EXISTS promotions (
      id SERIAL PRIMARY KEY,
      restaurante_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE
    );

    ALTER TABLE promotions
      ADD COLUMN IF NOT EXISTS festival_id INTEGER REFERENCES festivals(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS tipo VARCHAR(100),
      ADD COLUMN IF NOT EXISTS descripcion TEXT,
      ADD COLUMN IF NOT EXISTS fecha_inicio DATE,
      ADD COLUMN IF NOT EXISTS fecha_fin DATE,
      ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

    CREATE TABLE IF NOT EXISTS demand_logs (
      id SERIAL PRIMARY KEY,
      query TEXT NOT NULL,
      municipio VARCHAR(255),
      departamento VARCHAR(255),
      codigo_dane VARCHAR(5),
      source VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id SERIAL PRIMARY KEY,
      dish_id INTEGER REFERENCES dishes(id) ON DELETE SET NULL,
      restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE SET NULL,
      festival_id INTEGER REFERENCES festivals(id) ON DELETE SET NULL,
      event VARCHAR(100) NOT NULL,
      source VARCHAR(100),
      codigo_dane VARCHAR(5),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS partner_users (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      telefono VARCHAR(50),
      role VARCHAR(50) DEFAULT 'partner',
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS partner_restaurants (
      id SERIAL PRIMARY KEY,

      user_id INTEGER REFERENCES partner_users(id) ON DELETE CASCADE,

      nombre VARCHAR(255) NOT NULL,
      descripcion TEXT,

      ciudad VARCHAR(255),
      municipio VARCHAR(255),
      departamento VARCHAR(255),
      codigo_dane VARCHAR(5),

      direccion TEXT,
      whatsapp TEXT,
      telefono TEXT,

      logo_url TEXT,
      portada_url TEXT,

      categoria VARCHAR(255),

      activo BOOLEAN DEFAULT true,
      verificado BOOLEAN DEFAULT false,

      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS partner_dishes (
      id SERIAL PRIMARY KEY,

      restaurant_id INTEGER REFERENCES partner_restaurants(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES partner_users(id) ON DELETE CASCADE,

      nombre VARCHAR(255) NOT NULL,
      descripcion TEXT,
      ingredientes TEXT,
      precio NUMERIC,
      categoria VARCHAR(255),

      imagen_url TEXT,

      disponible BOOLEAN DEFAULT true,
      activo BOOLEAN DEFAULT true,
      verificado BOOLEAN DEFAULT false,

      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_municipalities_codigo_dane ON municipalities(codigo_dane);
    CREATE INDEX IF NOT EXISTS idx_festivals_codigo_dane ON festivals(codigo_dane);
    CREATE INDEX IF NOT EXISTS idx_restaurants_codigo_dane ON restaurants(codigo_dane);
    CREATE INDEX IF NOT EXISTS idx_demand_codigo_dane ON demand_logs(codigo_dane);
    CREATE INDEX IF NOT EXISTS idx_analytics_restaurant ON analytics_events(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_dish ON analytics_events(dish_id);

    CREATE INDEX IF NOT EXISTS idx_partner_restaurants_user ON partner_restaurants(user_id);
    CREATE INDEX IF NOT EXISTS idx_partner_dishes_user ON partner_dishes(user_id);
    CREATE INDEX IF NOT EXISTS idx_partner_dishes_restaurant ON partner_dishes(restaurant_id);
  `;

  try {
    await pool.query(queryText);
    console.log("✅ Tablas FestQuest + DishQuest verificadas/actualizadas correctamente");
  } catch (err) {
    console.error("❌ Error creando tablas:", err.message);
  }
};

pool.connect((err, client, release) => {
  if (err) {
    return console.error("❌ Error de conexión", err.stack);
  }

  console.log("✅ Conexión a PostgreSQL exitosa");
  crearTablas();
  release();
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};