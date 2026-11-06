require('dotenv').config();

const app = require('./src/app');
const connectMongoDB = require('./src/config/mongodb');
const db = require('./src/config/postgres');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectMongoDB();

        await db.raw('SELECT 1');

        console.log('PostgreSQL connected successfully');

        app.listen(PORT, () => {
            console.log(`KoboMarket server is running on port ${PORT}`);
        });
    } catch (error) {
        console.log('Server startup failed');

        await db.destroy().catch(() => {});

        process.exit(1);
    }
};

startServer();