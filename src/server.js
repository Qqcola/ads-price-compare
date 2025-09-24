// src/server.js
require('dotenv').config();

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

const {
  MONGODB_APP_USER,
  MONGODB_APP_PASSWORD,
  MONGODB_HOST,
  MONGODB_PORT,
  DB_NAME,
  COLLECTION_ITEM_NAME,
} = process.env;

// NOTE: Adjust authSource depending on where the user was created.
// If user was created in 'admin', switch ?authSource=admin
const mongoUri = `mongodb://${encodeURIComponent(MONGODB_APP_USER)}:${encodeURIComponent(
  MONGODB_APP_PASSWORD
)}@${MONGODB_HOST}:${MONGODB_PORT}/${DB_NAME}?authSource=${DB_NAME}`;

mongoose
  .connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ Mongo connection error:', err.message);
    process.exit(1);
  });

const db = mongoose.connection;

// ---------- API ----------

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Search ALL matches (limit via ?limit=, default 200, max 2000)
app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  const limit = Math.max(1, Math.min(parseInt(req.query.limit || '200', 10), 2000));
  if (!q) return res.json([]);

  try {
    // Basic case-insensitive regex search on common fields
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const docs = await db
      .collection(COLLECTION_ITEM_NAME)
      .find({
        $or: [
          { name: rx },
          { brand: rx },
          // { retailer: rx }, // uncomment if 'retailer' is top-level
        ],
      }, { maxTimeMS: 3000 }) // safety timeout
      .limit(limit)
      .toArray();
    res.json(docs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Trending (random 16 for the home page)
app.get('/api/trending', async (_req, res) => {
  try {
    const docs = await db
      .collection(COLLECTION_ITEM_NAME)
      .aggregate([{ $sample: { size: 16 } }])
      .toArray();
    res.json(docs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch trending' });
  }
});

// ---------- Static frontend ----------
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));

// SPA catch-all
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 ADS app running at http://localhost:${PORT}`);
});
