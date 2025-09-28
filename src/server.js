// src/server.js
require("./configs/db");
require("dotenv").config();

const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cors = require("cors");
const app = express();

const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" })); // parse application/json
app.use(express.urlencoded({ extended: true }));

const routes = require("./routes/api");
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ---------- Static frontend ----------
const PUBLIC_DIR = path.join(__dirname, "..", "public");
app.use(express.static(PUBLIC_DIR));

app.use("/api", routes);

app.get("/chat", (req, res) => {
  console.log("Access to /chatbot");
  res.sendFile(path.join(PUBLIC_DIR, "chatbot.html"));
});

app.get("/chat/:conversationId", (req, res) => {
  const conversationId = req.params["conversationId"];
  console.log(`Chat conversation ID: ${conversationId}`);
  res.sendFile(path.join(PUBLIC_DIR, "chatbot.html"));
});

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("message_chatbot", async (params) => {
    // console.log("start", query);
    try {
      const resp = await fetch("http://localhost:3010/inference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: params['text'], history: params['history']}),
      });

      if (!resp.ok) {
        const text = await resp.text();
        socket.emit("chunk_response", { message: "Upstream error: " +  params['text'] });
        return;
      }

      for await (const chunk of resp.body) {
        let process_chunk = JSON.parse(Buffer.from(chunk).toString('utf8'))['text'];
        socket.emit("chunk_response", { process_chunk });
      }
     
      socket.emit("done", { message: "done" });
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

