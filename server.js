// server.js
const express = require('express');
const app = express();
app.use(express.static('public'));   // <— this line
// …rest of your server (port, routes)
