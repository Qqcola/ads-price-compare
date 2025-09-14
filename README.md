# ADS – Australian Dietary Supplements Price Comparison & Chatbot

## 📖 Project Overview
A web application to compare dietary supplement prices across multiple retailers and provide an AI-powered chatbot to assist users.
Built with Node.js/Express (MVC), MongoDB, and Materialize CSS.

## 🛠️ Tech Stack
Backend: Node.js, Express, Mongoose
Frontend: Materialize CSS, Vanilla JS
Database: MongoDB (Atlas or local)
Testing: Mocha, Chai, Supertest
Other: dotenv, morgan, cors

## 🚀 Getting Started
Follow these steps to set up the project locally:

### 1. Clone the repository
git clone https://github.com/Qqcola/ads-price-compare.git
cd ads-price-compare

### 2. Install dependencies
npm install

### 3. Set up environment variables
Copy the example file:
cp .env.example .env
Open .env and fill in the values (e.g., PORT, MONGO_URL).

### 4. Run the development server
npm run dev

### 5. Initialize the MongoDB server and insert data into the database
Install Docker Desktop on your local computer

Start Docker desktop, open terminal and access the project folder

Create an .env file with the variables MONGODB_ROOT_USER, MONGODB_ROOT_PASSWORD, MONGODB_APP_USER, MONGODB_APP_PASSWORD, MONGODB_HOST, MONGODB_PORT, DB_NAME, COLLECTION_ITEM_NAME, COLLECTION_ITEM_LI_NAME, and COLLECTION_CHAT_NAME

Run the command: docker-compose up --build -d

After the above command completes, check if the two containers data_seeding_gp and mongo_db are created using the command: docker ps -a

Wait about 1 minute for the data push process to complete.

To check if the process is complete, execute the following commands:

docker exec -it mongo_db /bin/bash

mongosh "mongodb://admin:sit725groupproject@localhost:27017/"

use SIT725GP

show collections

If the terminal displays 2 collections items and items_li, the process is complete.

Use the 2 commands docker rm -f <container_name> and docker rmi -f <image-name> to delete the container and the image created for pushing data (data_seeding_gp and data_seeding_group_project:latest)

To restart, start, and stop the MongDB server, execute the commands: docker restart mongo_db, docker start mongo_db, and docker stop mongo_db



The app will start at: http://localhost:3000

## 📂 Project Structure
```text
ads-price-compare/
├── docs/           # Design assets, SRS, diagrams
├── public/         # Frontend (HTML, CSS, JS)
├── scripts/        # Scraping jobs, automation
├── src/            # Backend (controllers, models, routes, utils)
├── test/           # Automated tests
├── .env.example    # Environment variable template
├── .gitignore      # Git ignore rules
├── package.json    # Dependencies and scripts
└── README.md       # Project documentation
```

## 👥 Team Roles & Contributions

### Jacki Ngau – Frontend Development (Materialize)
Repo areas:
public/ → index.html, css/, js/

Responsibilities:
Implement Figma mockups provided by Member 2
Build the frontend with Materialize CSS for styling and layout
Add interactivity in public/js/ (AJAX/fetch calls to backend APIs)
Create the product comparison table and chatbot UI panel

### Gia Khanh Ngo – Design (UI/UX)
Repo areas:
docs/ → design assets (Canva, wireframes, screenshots)
Guides what goes in public/

Responsibilities:
Define the look & feel (layout, accessibility, visual consistency)
Provide design mockups for key pages (comparison grid, chatbot area)
Document design decisions and user flow

### Minh Khiem Pham – Data Scraping & Chatbot
Repo areas:
scripts/ → scraping jobs (scrapeProducts.js)
src/utils/ → scraping/chatbot helpers
src/models/ → product model & additional schemas
src/controllers/ → chatbot controller (chatController.js)
src/routes/ → scraping/chatbot endpoints (products.js, chat.js)

Responsibilities:
Write scrapers to pull product data (e.g., Chemist Warehouse, iHerb)
Save scraped results into MongoDB via Product.js model
Implement chatbot backend logic (rules-based or API-driven)
Provide API endpoints for frontend integration

### Christo Raju – Testing
Repo areas:
test/ → owns the test suite
May extend into controllers/ and routes/ for coverage

Responsibilities:
Write unit tests (controllers)
Write integration tests (routes + database)
Write end-to-end tests simulating full user flows (frontend → backend → DB)
Track and maintain test coverage

## 📜 NPM Scripts
npm start → Run the server (production mode)
npm run dev → Run the server with nodemon (auto-restart on changes)
npm test → Run the test suite