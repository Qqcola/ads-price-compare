require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Serve static frontend (public/)
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Example API route
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Server is running' });
});

// --- Catch-all for client-side routes (Express 5 friendly):
// Use a regex OR a final app.use, not a bare "*"
app.get(/.*/, (req, res, next) => {
  // let API requests fall through to 404 or other handlers
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 ADS app running at http://localhost:${PORT}`);
});
