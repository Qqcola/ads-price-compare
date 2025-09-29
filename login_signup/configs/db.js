const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const {
  MONGODB_APP_USER,
  MONGODB_APP_PASSWORD,
  MONGODB_HOST = 'localhost',
  MONGODB_PORT = '27017',
  DB_NAME = 'ads',
} = process.env;

const mongoUri =
  `mongodb://${encodeURIComponent(MONGODB_APP_USER || '')}` +
  `:${encodeURIComponent(MONGODB_APP_PASSWORD || '')}` +
  `@${MONGODB_HOST}:${MONGODB_PORT}/${DB_NAME}?authSource=${DB_NAME}`;

function mask(uri) {
  return uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:*****@');
}

// Minimal validation to get the errors any
if (!MONGODB_APP_USER || !MONGODB_APP_PASSWORD) {
  console.error('❌ MONGODB_APP_USER / MONGODB_APP_PASSWORD are missing in .env');
  process.exit(1);
}

console.log('🧩 Using MONGO_URI:', mask(mongoUri));

mongoose.set('strictQuery', false);

module.exports = async function connectDB() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('   Tried:', mask(mongoUri));
    process.exit(1);
  }
};
