require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Static frontend
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));

// Example API (keep/replace with your routes)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Server is running' });
});

// Catch-all for client-side routes (not /api/*)
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 ADS app running at http://localhost:${PORT}`);
});
