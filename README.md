# ADS – Australian Dietary Supplements (Price Comparison & Chatbot)

A web app to compare dietary supplement prices across retailers and provide an assistive chatbot.  
Built with **Node.js/Express (MVC)**, **MongoDB (Docker)**, and **Materialize CSS**.

---

## ✨ Features

- **Search & Results**: fast keyword search with smart de-duplication and retailer merge.
- **My List (CRUD)**: save/remove products to a personal list; view item details; jump to retailer pages.
- **Per-user Lists**: list operations are scoped by **session/email**, so each user sees their own items.
- **Item Detail View**: structured pricing, retailer links, reviews label logic, and safe title truncation.
- **Pagination**: ~20 items per page with consistent totals and bounds handling.
- **Chatbot**: assists with finding products and general queries (service integration documented below).
- **Polished UI**: Materialize grid/spacing refinements, responsive layout, sensible truncation with single ellipsis.

---

## 🧱 Architecture

- **Backend**: Node.js + Express (MVC: `controllers/`, `models/`, `routes/`, `utils/`)
- **Database**: MongoDB in Docker (`mongo_db`), seeded by a short-lived container (`data_seeding_gp`)
- **Frontend**: Materialize CSS + vanilla JS (search grid, list actions, item details)
- **Tests**: Mocha + Chai (`test/`), aligned to real UI/logic

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Mongoose
- **Frontend**: Materialize CSS, Vanilla JS
- **Database**: MongoDB (Docker)
- **Testing**: Mocha, Chai
- **Other**: dotenv, morgan, cors

---

## 🚀 Quickstart

### 1) Clone & install
```bash
git clone https://github.com/Qqcola/ads-price-compare.git
cd ads-price-compare
npm install
```

---

### 2) Create your .env (use the template)
```bash
cp .env.example .env
```

Open .env and set values (see full list below). At minimum, confirm Mongo credentials match docker-compose.yml.

---

### 3) Start MongoDB in Docker and seed data

Requires Docker Desktop running.

```bash
docker-compose up --build -d
docker ps -a    # check that `mongo_db` and `data_seeding_gp` appeared
```

Wait ~1 minute for seeding to finish, then verify:

```bash
docker exec -it mongo_db /bin/bash
mongosh "mongodb://admin:sit725groupproject@localhost:27017/"
use SIT725GP
show collections   # expect: items, items_li
exit
```

(After seeding completes, you can optionally clean up the seeding image:)

```bash
docker rm -f data_seeding_gp
docker rmi -f data_seeding_group_project:latest
```

Common Mongo container actions:

```bash
docker restart mongo_db
docker start mongo_db
docker stop mongo_db
```

---

### 4) Run the web app (development)

```bash
npm run dev
```

App: http://localhost:3000

Optional – Chatbot service: If your branch includes the chatbot microservice, start it from its folder with npm start (commonly runs at http://localhost:3010). Keep both services running during development.

---

### 🔐 Environment Variables

Copy from .env.example then adjust as needed:

```bash
# MongoDB credentials
MONGODB_ROOT_USER=admin
MONGODB_ROOT_PASSWORD=sit725groupproject
MONGODB_APP_USER=sit725
MONGODB_APP_PASSWORD=sit725groupproject

# MongoDB connection (host/port)
MONGODB_HOST=localhost
MONGODB_PORT=20725

# Database & collections
DB_NAME=SIT725GP
COLLECTION_ITEM_NAME=items
COLLECTION_ITEM_LI_NAME=items_li
COLLECTION_CHAT_NAME=conversations

# Google GenAI
API_KEYS="AIzaSyAsvzeraBjVll28lh_8xVBDXaIxK2DxcC0, AIzaSyAEbenbT57mwmcjGwddmYV-NFN3hSdHzYY, AIzaSyC-ovgaE-ifQKLgA9x_SONBaaBbxdWXbsQ, AIzaSyAF9XaI0nlEArEZh6XUqSDSzDa2DLV4x3I, AIzaSyD7ca_k4S0xuLtPvGDj4-BFp9r9rganoRw, AIzaSyCmxYhzPZ7At1xAzeC7bGAUzCNkosRy7DM, AIzaSyADLS_avoX1SegVxSSOo-JgkhDED___5jk, AIzaSyC8CC4MN-1TCiSFCdAsPZDLWZn-J-jRGv0, AIzaSyC3mGG_9l1BgLIWAuBz1fYiiTEpwmqsZGI"
MODEL_NAME="gemini-2.0-flash"
```

Ensure these match the credentials in docker-compose.yml.
If you change PORT, also adjust your dev links.

---

## 🧪 Testing

```bash
npm test
```

What’s covered:

Search de-duplication & merge: ensures products are deduped (ID first, name+image fallback) and retailer price/URL maps are merged correctly.
File: dedupe.test.js

Pagination: ~20 items per page, correct totals/last-page count, and clamped bounds.
File: paginate.test.js

Retailer rows: merges price and URL maps and sorts by lowest price with correct links.
File: retailers.test.js

Reviews label logic: robust parsing/formatting, “Not yet reviewed” for null/garbage.
File: reviews.test.js

Title truncation: safe single-ellipsis truncation within limits, preferring space breaks.
File: truncate.test.js

---

## 🔌 API (dev endpoints)

Health: GET /api/health → { "ok": true }

Search: GET /api/search?q=<query> → results (deduped & merged retailers)

Trending: GET /api/trending → random sample (e.g., 16 items)

My List operates via the app’s authenticated/session flow with per-user list actions (save/remove), item details, and direct retailer navigation.

---

## 📂 Project Structure

ads-price-compare/
├── chatbot/
├── data_process/
├── data_seeing/
├── docs/
├── mongo_init/          
├── public/             
├── scripts/            
├── src/
├── test/
├── test-arifacts/
├── views/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package-lock.json
├── package.json
└── README.md

---

## 🧭 Development Notes (UI/UX)

Materialize grid/layout refinements for consistent card heights and spacing.

String truncation uses a single ellipsis and respects line length.

Retailer blocks show lowest price first with correct outbound link mapping.

---

## 🧰 NPM Scripts

npm start – start server (production mode)

npm run dev – start with nodemon (auto-reload)

npm test – run Mocha/Chai tests

---

## 🧑‍🤝‍🧑 Contributors

Jacki Ngau — Development, Materialize, PM

Minh Khiem Pham — Data scraping, Development, PM

Christo Raju — Development, Testing

---

## 🧯 Troubleshooting

Mongo auth/connection errors
Check that .env credentials match docker-compose.yml. Confirm container is running: docker ps -a.

No data in items / items_li
Allow ~1 minute after docker-compose up. View logs: docker logs data_seeding_gp. Rerun seeding if needed.

Port already in use
Change PORT in .env or stop the other process using that port.

Tests failing unexpectedly
Ensure Node version matches your team’s baseline, reinstall deps (rm -rf node_modules && npm install), and confirm sample data shape.

---

## ✅ What this README gives you

Quickstart, .env.example setup, contributor context, Docker notes, npm test instructions, and enough architecture detail that any teammate can clone → configure → run → contribute quickly.
