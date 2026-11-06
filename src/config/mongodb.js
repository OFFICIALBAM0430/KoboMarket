const mongoose = require("mongoose");

const connectMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("MongoDb connected successfully");
    } catch (error) {
        console.log("MongoDB connection failed");
        throw error;
    }
};

module.exports = connectMongoDB;