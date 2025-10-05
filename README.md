# ADS – Australian Dietary Supplements (Price Comparison & Chatbot)

A web app to compare dietary supplement prices across retailers and provide an assistive chatbot.  
Built with **Node.js/Express (MVC)**, **MongoDB (Docker)**, and **Materialize CSS**.

---

## ✨ Features

- **Search & Results**: fast keyword search with smart de-duplication and retailer merge.
- **My List (CRUD)**: save/remove products to a personal list; view item details; jump to retailer pages.
- **Per-user Lists**: list operations are scoped by **session/email**, so each user sees their own items.
- **Item Detail View**: structured pricing, retailer links, reviews label logic, and safe title truncation.
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

- **Backend**: Node.js, Express, Mongoose, Socket.IO, GoogleAPI
- **Frontend**: HTML, Materialize CSS, Vanilla JS
- **Database**: MongoDB (Docker)
- **Testing**: Mocha, Chai
- **Other**: dotenv, morgan, cors

---

## 🚀 Quickstart

### 1) Clone & install
```bash
git clone https://github.com/Qqcola/ads-price-compare.git
cd ads-price-compare
```

---

### 2) Create your .env (use the template)
```bash
cp .env.example .env
```

Open .env and set values (see full list below). At minimum, confirm Mongo credentials match docker-compose.yml.

---

### 3) Build and start the application using Docker 

Requires Docker Desktop running.

```bash
docker-compose up --build -d
docker ps -a    # check these containers `mongo_db`, `data_seeding_gp`, 'frontend_service', and 'chatbot_service' appeared
```

Wait ~1 minute for seeding to finish pushing data to the database, then verify:

```bash
docker exec -it mongo_db /bin/bash
mongosh "mongodb://admin:sit725groupproject@localhost:27017/"
use SIT725GP
show collections   # expect: items, items_li
exit
```

(After seeding completes, you can optionally clean up the seeding container and image:)

```bash
docker rm -f data_seeding_gp
docker rmi -f data_seeding_group_project:latest
```

Common service container actions:

```bash
docker restart <service_name>
docker start <service_name>
docker stop <service_name>
```

---

### 4) Run the web app (development)

Once the building images and running containers via the docker-compose command are complete, the application (frontend_service) runs at http://localhost:3000.

---

### 🔐 Environment Variables

IMPORTANT - Create an .env file in the root folder (Copy from .env.example then adjust as needed):

```bash
# MongoDB credentials
MONGODB_ROOT_USER="admin"
MONGODB_ROOT_PASSWORD="sit725groupproject"
MONGODB_APP_USER="sit725"
MONGODB_APP_PASSWORD="sit725groupproject"
MONGODB_HOST="localhost"
MONGODB_PORT=20725
DB_NAME="SIT725GP"
COLLECTION_ITEM_NAME="items"
COLLECTION_ITEM_LI_NAME="items_li"
COLLECTION_CHAT_NAME="conversations"

# # token lifetimes (strings like 10,, 7d are OK)

JWT_ACCESS_SECRET=db3923b606fdbe9f83b8358aee52847acbfbfc30475173a872b65d909b098186
JWT_REFRESH_SECRET=6ea10354c51071ae76a115b48cddd367da318850ecee7280fd2da8262d373706
 ACCESS_TOKEN_TTL=1h
REFRESH_TOKEN_TTL=1d
 
# # local dev
NODE_ENV=development

#chatbot keys
API_KEYS="<API_KEY_1>, <API_KEY_2>, <API_KEY_3>, etc" #can be obtained via https://console.cloud.google.com/ (Note: enable Gemini API beforehand)
#The more keys, the more stable operation is guaranteed.
MODEL_NAME="gemini-2.0-flash"

#service ports
CHATSERVICE_PORT=3010
FRONTENDSERVICE_PORT=3000
 
```

---

## 🧪 Testing

```bash
docker exec -it frontend_service /bin/sh
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

Data connection: Check connection to database and test some simple queries.
File: database.test.js

Item APIs: Check out some APIs that interact with collections 'Items'.
File: itemsAPI.test.js

---

## 🔌 API (dev endpoints)

Health: GET /api/health → { "ok": true }

Search: GET /api/search?q=<query> → results (deduped & merged retailers)

Trending: GET /api/trending → random sample (e.g., 16 items)

My List operates via the app’s authenticated/session flow with per-user list actions (save/remove), item details, and direct retailer navigation.

---

## 📂 Project Structure

```
ads-price-compare/
├── chatbot/
├── data_process/
├── data_seeing/
├── docs/
├── frontend
├── mongo_init/          
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

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
