require("dotenv").config();
const mongoose = require('mongoose');

const {
  MONGODB_APP_USER,
  MONGODB_APP_PASSWORD,
  MONGODB_HOST,
  MONGODB_PORT,
  DB_NAME,
  COLLECTION_ITEM_NAME,
} = process.env;

const mongoUri = `mongodb://${encodeURIComponent(MONGODB_APP_USER)}:${encodeURIComponent(MONGODB_APP_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${DB_NAME}?authSource=${DB_NAME}`;

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
    console.log('✅ Connected to MongoDB');
});

module.exports = mongoose;
