// src/server.js
require('./configs/db');
require("dotenv").config();

const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cors = require("cors");
const app = express();

const http = require('http').createServer(app);
const io = require("socket.io")(http);

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

const routes = require('./routes/api');
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ---------- Static frontend ----------
const PUBLIC_DIR = path.join(__dirname, "..", "public");
app.use(express.static(PUBLIC_DIR));

app.use('/api', routes);

app.get('/chat', (req, res) => {
    console.log('Access to /chatbot');
    res.sendFile(path.join(PUBLIC_DIR, 'chatbot.html')); 
});

app.get('/chat/:conversationId', (req, res) => {
    const conversationId = req.params['conversationId'];
    console.log(`Chat conversation ID: ${conversationId}`);
    res.sendFile(path.join(PUBLIC_DIR, 'chatbot.html'));
});

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("message_chatbot", async (query) => {
    console.log("start", query);

    try {
      const resp = await fetch("http://localhost:3010/inference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({"query": query}),
      });

      if (!resp.ok) {
        const text = await resp.text();
        socket.emit("error", { message: "Upstream error: " + text });
        return;
      }

      // const reader = resp.body.getReader();
      // const decoder = new TextDecoder();
      // while (true) {
      //   const { done, value } = await reader.read();
      //   if (done) break;
      //   const chunk = decoder.decode(value, { stream: true });
      //   socket.emit("chunk_response", { chunk });
      // }
      // socket.emit("done", { sessionId });
      const payload = await resp.json();
      // payload.data expected to be a plain text string
      const data = payload && (payload.data ?? "");
      if (!data || typeof data !== "string") {
        socket.emit("error", { sessionId, message: "Invalid or empty data from upstream" });
        return;
      }
      const CHUNK_SIZE = 5; // bạn có thể chỉnh nhỏ hơn nếu muốn nhiều chunk hơn
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        setTimeout(() => {}, 1000);
        socket.emit("chunk_response", { chunk });
      }
      socket.emit("done", { message: payload.message ?? "done" });
    } catch (err) {
      console.error("broadcaster fetch error", err);
      socket.emit("error", { message: String(err) });
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`ADS app running at http://localhost:${PORT}`);
});
