import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

const getUserFromToken = (authHeader) => {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;
  const [id, role] = token.split('-');
  if (!id || !role) return null;
  const user = db
    .prepare('SELECT id, email, role FROM users WHERE id = ?')
    .get(id);
  if (!user || user.role !== role) return null;
  return user;
};

const requireAuth = (roles = []) => (req, res, next) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (roles.length && !roles.includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  req.user = user;
  return next();
};

const logAudit = (actorUserId, action, entityType, entityId, metadata = {}) => {
  db.prepare(
    `INSERT INTO audit_logs
      (created_at, actor_user_id, action, entity_type, entity_id, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    new Date().toISOString(),
    actorUserId,
    action,
    entityType,
    entityId,
    JSON.stringify(metadata)
  );
};

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db
    .prepare('SELECT id, email, role FROM users WHERE email = ? AND password = ?')
    .get(email, password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = `${user.id}-${user.role}`;
  return res.json({ token, user });
});

app.get('/api/supplier/products', requireAuth(['SUPPLIER']), (req, res) => {
  const supplier = db
    .prepare('SELECT * FROM suppliers WHERE user_id = ?')
    .get(req.user.id);
  if (!supplier) {
    return res.status(404).json({ message: 'Supplier not found' });
  }

  const products = db
    .prepare('SELECT * FROM products WHERE supplier_id = ? ORDER BY id DESC')
    .all(supplier.id)
    .map((product) => ({
      ...product,
      certifications: JSON.parse(product.certifications_json || '[]')
    }));

  return res.json({ supplier, products });
});

app.post('/api/supplier/products', requireAuth(['SUPPLIER']), (req, res) => {
  const supplier = db
    .prepare('SELECT * FROM suppliers WHERE user_id = ?')
    .get(req.user.id);
  if (!supplier) {
    return res.status(404).json({ message: 'Supplier not found' });
  }

  const {
    name,
    category,
    origin_country,
    producer_name,
    certifications,
    co2_per_kg,
    production_method,
    evidence_notes,
    evidence_url
  } = req.body;

  const result = db.prepare(
    `INSERT INTO products
      (supplier_id, name, category, origin_country, producer_name, certifications_json, co2_per_kg, production_method, evidence_url, evidence_notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    supplier.id,
    name,
    category,
    origin_country,
    producer_name,
    JSON.stringify(certifications || []),
    co2_per_kg,
    production_method,
    evidence_url || '',
    evidence_notes || '',
    'DRAFT'
  );

  return res.status(201).json({ id: result.lastInsertRowid });
});

app.post('/api/supplier/products/:id/submit', requireAuth(['SUPPLIER']), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  if (product.status === 'VERIFIED') {
    return res.status(400).json({ message: 'Product already verified' });
  }
  db.prepare('UPDATE products SET status = ? WHERE id = ?').run('SUBMITTED', product.id);
  logAudit(req.user.id, 'SUBMITTED', 'product', product.id, { status: 'SUBMITTED' });
  return res.json({ status: 'SUBMITTED' });
});

app.post('/api/admin/products/:id/verify', requireAuth(['SUPPLIER', 'ADMIN']), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  if (product.status === 'VERIFIED') {
    return res.status(400).json({ message: 'Already verified' });
  }
  const { verification_notes } = req.body;
  if (!verification_notes || !verification_notes.trim()) {
    return res.status(400).json({ message: 'Verification notes are required' });
  }
  db.prepare('UPDATE products SET status = ?, verification_notes = ? WHERE id = ?').run(
    'VERIFIED',
    verification_notes.trim(),
    product.id
  );
  logAudit(req.user.id, 'VERIFIED', 'product', product.id, {
    status: 'VERIFIED',
    verification_notes: verification_notes.trim()
  });
  return res.json({ status: 'VERIFIED' });
});

app.post('/api/admin/products/:id/reject', requireAuth(['SUPPLIER', 'ADMIN']), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  if (product.status === 'VERIFIED') {
    return res.status(400).json({ message: 'Verified products cannot be rejected' });
  }
  const { verification_notes } = req.body;
  if (!verification_notes || !verification_notes.trim()) {
    return res.status(400).json({ message: 'Verification notes are required' });
  }
  db.prepare('UPDATE products SET status = ?, verification_notes = ? WHERE id = ?').run(
    'REJECTED',
    verification_notes.trim(),
    product.id
  );
  logAudit(req.user.id, 'REJECTED', 'product', product.id, {
    status: 'REJECTED',
    verification_notes: verification_notes.trim()
  });
  return res.json({ status: 'REJECTED' });
});

app.get('/api/restaurant/catalog', requireAuth(['RESTAURANT']), (req, res) => {
  const products = db
    .prepare(
      `SELECT products.*, suppliers.name as supplier_name
       FROM products
       JOIN suppliers ON products.supplier_id = suppliers.id
       WHERE products.status = 'VERIFIED'
       ORDER BY products.id DESC`
    )
    .all()
    .map((product) => ({
      ...product,
      certifications: JSON.parse(product.certifications_json || '[]')
    }));

  return res.json({ products });
});

app.post('/api/restaurant/selection', requireAuth(['RESTAURANT']), (req, res) => {
  const restaurant = db
    .prepare('SELECT * FROM restaurants WHERE user_id = ?')
    .get(req.user.id);
  if (!restaurant) {
    return res.status(404).json({ message: 'Restaurant not found' });
  }

  const { product_id, approved_claims } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product || product.status !== 'VERIFIED') {
    return res.status(400).json({ message: 'Only verified products can be selected' });
  }

  const existing = db
    .prepare(
      'SELECT * FROM restaurant_products WHERE restaurant_id = ? AND product_id = ?'
    )
    .get(restaurant.id, product_id);

  if (existing) {
    db.prepare(
      'UPDATE restaurant_products SET approved_claims_json = ? WHERE id = ?'
    ).run(JSON.stringify(approved_claims || []), existing.id);
  } else {
    db.prepare(
      'INSERT INTO restaurant_products (restaurant_id, product_id, approved_claims_json) VALUES (?, ?, ?)'
    ).run(restaurant.id, product_id, JSON.stringify(approved_claims || []));
  }

  return res.json({ success: true });
});

app.get('/api/restaurant/selection', requireAuth(['RESTAURANT']), (req, res) => {
  const restaurant = db
    .prepare('SELECT * FROM restaurants WHERE user_id = ?')
    .get(req.user.id);
  if (!restaurant) {
    return res.status(404).json({ message: 'Restaurant not found' });
  }

  const selections = db
    .prepare(
      `SELECT restaurant_products.*, products.name, products.status, suppliers.name as supplier_name
       FROM restaurant_products
       JOIN products ON restaurant_products.product_id = products.id
       JOIN suppliers ON products.supplier_id = suppliers.id
       WHERE restaurant_products.restaurant_id = ?`
    )
    .all(restaurant.id)
    .map((selection) => ({
      ...selection,
      approved_claims: JSON.parse(selection.approved_claims_json || '[]')
    }));

  return res.json({ selections });
});

app.get('/api/audit/:entityType/:entityId', requireAuth(['SUPPLIER', 'RESTAURANT', 'ADMIN']), (req, res) => {
  const logs = db
    .prepare(
      `SELECT audit_logs.*, users.email as actor_email
       FROM audit_logs
       JOIN users ON audit_logs.actor_user_id = users.id
       WHERE entity_type = ? AND entity_id = ?
       ORDER BY audit_logs.id DESC`
    )
    .all(req.params.entityType, req.params.entityId)
    .map((log) => ({
      ...log,
      metadata: JSON.parse(log.metadata_json || '{}')
    }));

  return res.json({ logs });
});

app.get('/api/product/:id', requireAuth(['SUPPLIER', 'RESTAURANT', 'ADMIN']), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(product.supplier_id);
  const selection = db
    .prepare(
      `SELECT * FROM restaurant_products
       JOIN restaurants ON restaurant_products.restaurant_id = restaurants.id
       WHERE restaurant_products.product_id = ? AND restaurants.user_id = ?`
    )
    .get(product.id, req.user.id);

  return res.json({
    product: {
      ...product,
      certifications: JSON.parse(product.certifications_json || '[]')
    },
    supplier,
    selection: selection
      ? {
          ...selection,
          approved_claims: JSON.parse(selection.approved_claims_json || '[]')
        }
      : null
  });
});

app.get('/api/products/:id', requireAuth(['SUPPLIER', 'RESTAURANT', 'ADMIN']), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(product.supplier_id);
  const selection = db
    .prepare(
      `SELECT * FROM restaurant_products
       JOIN restaurants ON restaurant_products.restaurant_id = restaurants.id
       WHERE restaurant_products.product_id = ? AND restaurants.user_id = ?`
    )
    .get(product.id, req.user.id);

  return res.json({
    product: {
      ...product,
      certifications: JSON.parse(product.certifications_json || '[]')
    },
    supplier,
    selection: selection
      ? {
          ...selection,
          approved_claims: JSON.parse(selection.approved_claims_json || '[]')
        }
      : null
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
