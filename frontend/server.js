// src/server.js
require("./src/configs/db");

const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");

const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" })); // parse application/json
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); 

const authRoutes = require("./src/routes/auth");
const authController = require('./src/controllers/authController');
const routes = require("./src/routes/api");
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ---------- Static frontend ----------
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || "http://localhost:3030";
const PUBLIC_DIR = path.join(__dirname, "public");
// app.use(express.static(PUBLIC_DIR));
app.use(express.static(PUBLIC_DIR, { index: "./landing_page.html" }))

app.use("/", authRoutes);
app.use("/api", routes);
// app.get("/api/me", authController.me);  
// app.get("/api/session", authController.sessionInfo); 

app.get("/chat", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "chatbot.html"));
});

app.get("/chat/:conversationId", (req, res) => {
  const conversationId = req.params["conversationId"];
  res.sendFile(path.join(PUBLIC_DIR, "chatbot.html"));
});

app.get("/item", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "item.html"));
});

app.get("/index", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.get("/loginPage", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "login.html"));
});

app.get("/signupPage", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "signup.html"));
});

app.get("/homePage", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "home.html"));
});

app.get("/list", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "list.html"));
});

app.get("/search", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "search.html"));
});


app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
  res.status(204).end();
});

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("message_chatbot", async (params) => {
    // console.log("start", query);
    try {
      const resp = await fetch(`${CHAT_SERVICE_URL}/inference`, {
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
