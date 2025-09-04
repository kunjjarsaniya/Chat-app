const mongoose = require("mongoose");

const connectToDB = async () => {
    try {
        // Connection events
        mongoose.connection.on("connected", () => {
            console.log("MongoDB connected successfully");
        });
        
        mongoose.connection.on("error", (err) => {
            console.error("MongoDB connection error:", err);
        });
        
        mongoose.connection.on("disconnected", () => {
            console.log("MongoDB disconnected");
        });

        // Connection options
        const options = {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep retrying for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
            family: 4, // Use IPv4, skip trying IPv6
        };

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'ChatApp',
            ...options
        });

        console.log("Successfully connected to MongoDB");
        return mongoose.connection;
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        // In production, you might want to exit the process if DB connection fails
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
        throw error; // Re-throw to be handled by the caller
    }
};

module.exports = { connectToDB };