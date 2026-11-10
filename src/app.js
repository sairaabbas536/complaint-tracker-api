const express = require('express');
const path = require('path');
const db = require('./db');
const { validateComplaint, cleanComplaint } = require('./validate');
const app = express();

app.disable('x-powered-by');                          // do not reveal the framework

// ---------- security ----------
// 1) Security headers
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  next();
});

// 2) CORS: only local pages may call the API from a browser (Postman does not need CORS)
const ALLOWED_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use('/api', (req, res, next) => {
  const origin = req.get('Origin');
  if (origin && (ALLOWED_ORIGIN.test(origin) || origin === 'null')) {   // 'null' = page opened from a file
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    });
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  res.set('Cache-Control', 'no-store');
  next();
});

// 3) Simple rate limit: max 120 API requests per minute per client (stops request flooding)
const hits = new Map();
app.use('/api', (req, res, next) => {
  const now = Date.now();
  const h = hits.get(req.ip);
  if (!h || now > h.reset) hits.set(req.ip, { count: 1, reset: now + 60000 });
  else if (++h.count > 120) return res.status(429).json({ error: 'Too many requests, please try again later' });
  next();
});

// 4) Limit the request body size
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));   // serves the website

// ---------- CRUD routes (all SQL uses prepared statements -> no SQL injection) ----------
// CREATE
app.post('/api/complaints', (req, res) => {
  const err = validateComplaint(req.body);
  if (err) return res.status(400).json({ error: err });
  const c = cleanComplaint(req.body);
  const r = db.prepare('INSERT INTO complaints (studentName, rollNo, category, description, status) VALUES (?,?,?,?,?)')
    .run(c.studentName, c.rollNo, c.category, c.description, c.status);
  res.status(201).json(db.prepare('SELECT * FROM complaints WHERE id=?').get(r.lastInsertRowid));
});

// READ all
app.get('/api/complaints', (req, res) => {
  res.status(200).json(db.prepare('SELECT * FROM complaints').all());
});

// READ one
app.get('/api/complaints/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM complaints WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Complaint not found' });
  res.status(200).json(row);
});

// UPDATE
app.put('/api/complaints/:id', (req, res) => {
  const err = validateComplaint(req.body);
  if (err) return res.status(400).json({ error: err });
  const c = cleanComplaint(req.body);
  const r = db.prepare('UPDATE complaints SET studentName=?, rollNo=?, category=?, description=?, status=? WHERE id=?')
    .run(c.studentName, c.rollNo, c.category, c.description, c.status, req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Complaint not found' });
  res.status(200).json(db.prepare('SELECT * FROM complaints WHERE id=?').get(req.params.id));
});

// DELETE
app.delete('/api/complaints/:id', (req, res) => {
  const r = db.prepare('DELETE FROM complaints WHERE id=?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Complaint not found' });
  res.status(200).json({ message: 'Complaint deleted' });
});

// ---------- error handling (never show internal details to the client) ----------
app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
