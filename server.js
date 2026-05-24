// ============================================================
//  CRMS — Criminal Record Management System
//  Backend Server — Node.js + Express.js
//  Roll # AI-25 B | NUTech | CS160 | Ms. Sumera Aslam
// ============================================================

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');

const criminalsRouter = require('./routes/criminals');
const casesRouter     = require('./routes/cases');
const reportsRouter   = require('./routes/reports');
const lookupRouter    = require('./routes/lookup');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Serve Static Frontend ──
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ──
app.use('/api/criminals', criminalsRouter);
app.use('/api/cases',     casesRouter);
app.use('/api/reports',   reportsRouter);
app.use('/api/lookup',    lookupRouter);

// ── Health Check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', system: 'CRMS Punjab Police', timestamp: new Date().toISOString() });
});

// ── Root → Frontend ──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// ── Error Handler ──
app.use((err, req, res, next) => {
  console.error('[CRMS Error]', err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start Server ──
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║    CRMS — Punjab Police Department       ║');
  console.log('  ║    Criminal Record Management System     ║');
  console.log(`  ║    Server running on http://localhost:${PORT} ║`);
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});
