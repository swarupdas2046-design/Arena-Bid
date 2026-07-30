const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB Atlas...');
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Atlas connection failed: ${error.message}`);
        console.log('Starting In-Memory MongoDB as fallback...');
        
        try {
            const mongoServer = await MongoMemoryServer.create();
            const mongoUri = mongoServer.getUri();
            
            const conn = await mongoose.connect(mongoUri);
            console.log(`In-Memory MongoDB Connected: ${conn.connection.host}`);
        } catch (memError) {
            console.error(`In-Memory MongoDB failed to start: ${memError.message}`);
            process.exit(1);
        }
    }
};

module.exports = connectDB;
