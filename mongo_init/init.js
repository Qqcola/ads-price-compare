db.createUser({
    user: process.env.MONGODB_APP_USER,
    pwd: process.env.MONGODB_APP_PASSWORD,
    roles: [
        { role: "readWrite", db: process.env.DB_NAME }
    ]
});