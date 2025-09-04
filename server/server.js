const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { connectToDB } = require("./lib/db");
const userRouter = require("./routes/userRoutes");
const messageRouter = require("./routes/messageRoutes");

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware setup
app.use(express.json({ limit: "4mb" }));
app.use(cors());

// Routes setup
app.use("/api/status", (req, res) => res.send("Server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
});

// Initialize server and socket.io only in development
let server;
let io;

// Connect to database and start server in development
const startServer = async () => {
    try {
        await connectToDB();
        
        if (process.env.NODE_ENV !== "production") {
            server = http.createServer(app);
            
            // Initialize socket.io
            io = require('socket.io')(server, {
                cors: {
                    origin: '*',
                }
            });
            
            // Configure Cloudinary
            const cloudinary = require('cloudinary').v2;
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET
            });
            
            // Setup socket server
            const { setupSocketServer } = require('./socket/socketServer');
            setupSocketServer(io);
            
            const PORT = process.env.PORT || 3000;
            server.listen(PORT, () => {
                console.log(`Server is running on port ${PORT}`);
            });
        }
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start server in development
if (process.env.NODE_ENV !== "production") {
    startServer();
}

// Export for Vercel serverless functions
module.exports = app;