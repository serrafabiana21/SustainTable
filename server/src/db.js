import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    origin_country TEXT NOT NULL,
    producer_name TEXT NOT NULL,
    certifications_json TEXT NOT NULL,
    co2_per_kg REAL NOT NULL,
    production_method TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS restaurant_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    approved_claims_json TEXT NOT NULL,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    actor_user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    metadata_json TEXT NOT NULL,
    FOREIGN KEY (actor_user_id) REFERENCES users(id)
  );
`);

const seed = () => {
  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existing.count > 0) {
    return;
  }

  const insertUser = db.prepare(
    'INSERT INTO users (email, password, role) VALUES (?, ?, ?)'
  );
  const insertSupplier = db.prepare(
    'INSERT INTO suppliers (name, user_id) VALUES (?, ?)'
  );
  const insertRestaurant = db.prepare(
    'INSERT INTO restaurants (name, user_id) VALUES (?, ?)'
  );
  const insertProduct = db.prepare(
    `INSERT INTO products
      (supplier_id, name, category, origin_country, producer_name, certifications_json, co2_per_kg, production_method, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const supplierUser = insertUser.run(
    'supplier1@example.com',
    'password',
    'SUPPLIER'
  );
  const restaurantUser = insertUser.run(
    'restaurant1@example.com',
    'password',
    'RESTAURANT'
  );

  const supplier = insertSupplier.run('Nordic Farm Co', supplierUser.lastInsertRowid);
  insertRestaurant.run('Beyla Demo', restaurantUser.lastInsertRowid);

  const certifications = JSON.stringify(['Organic', 'Rainforest Alliance']);

  insertProduct.run(
    supplier.lastInsertRowid,
    'Arctic Root Vegetables',
    'Produce',
    'Norway',
    'Nordic Farm Co',
    certifications,
    1.2,
    'Regenerative',
    'VERIFIED'
  );

  insertProduct.run(
    supplier.lastInsertRowid,
    'Cedar Smoked Mushrooms',
    'Prepared Foods',
    'Sweden',
    'Nordic Farm Co',
    JSON.stringify(['Fair Trade']),
    2.4,
    'Low-energy smokehouse',
    'DRAFT'
  );
};

seed();

export default db;
