// test/setup.js
const http = require('http');
const { app } = require('../src/server');

let server;
let baseURL;

async function startServer() {
  await new Promise((resolve) => {
    server = http.createServer(app).listen(0, resolve);
  });
  const port = server.address().port;
  baseURL = `http://127.0.0.1:${port}`;
  return { server, baseURL };
}

async function stopServer() {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
  server = null;
}

module.exports = { startServer, stopServer };
