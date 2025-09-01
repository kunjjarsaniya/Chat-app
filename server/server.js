const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const path = require("path");

const { connectToDB } = require("./lib/db");
const userRouter = require("./routes/userRoutes");
const messageRouter = require("./routes/messageRoutes");

// load environment variables
dotenv.config();

// create Express app and http server
const app = express();
const server = http.createServer(app);

// socket.io setup
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

const { setupSocketServer } = require("./socket/socketServer");
setupSocketServer(io);

// Cloudinary setup
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middleware setup
app.use(express.json({ limit: "4mb" }));
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

// fallback route for SPA
app.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});  

// ✅ Start server properly (must use server.listen, not app.listen)
const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
