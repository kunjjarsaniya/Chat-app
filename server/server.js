const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { connectToDB } = require("./lib/db");
const userRouter = require("./routes/userRoutes");
const messageRouter = require("./routes/messageRoutes");

const path = require("path");

// load environment variables
dotenv.config();

// create Express app and http server
const app = express();
const server = http.createServer(app);

// Pass 'server' (not 'app') to socket.io

const io = require('socket.io')(server, {
    cors: {
        origin: '*',
    }
});

// Setup socket server
// Configure Cloudinary
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const { setupSocketServer } = require('./socket/socketServer');
setupSocketServer(io);

// Middleware setup
app.use(express.json({limit: "4mb"}));
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

// Routes setup
app.use("/api/status", (req, res) => res.send("Server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
});

// connect to database
connectToDB();

// 
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
})

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
