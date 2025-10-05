FROM node:22-alpine

WORKDIR /app
COPY . /app

RUN npm init -y && npm install express mongoose morgan cors socket.io cookie-parser bcrypt jsonwebtoken escape-string-regexp chai supertest request playwright mocha --save

EXPOSE 3000
CMD ["npm", "start"]