const express = require("express");
const {protectRoute} = require("../middleware/auth");
const {getUserForSidebar, getMessages, markMessageAsSeen, sendMessage} = require("../controllers/MessageController");

const messageRouter = express.Router();

messageRouter.get("/users", protectRoute, getUserForSidebar);
messageRouter.get("/:id", protectRoute, getMessages);
messageRouter.put("/mark-seen/:id", protectRoute, markMessageAsSeen);
messageRouter.post("/send/:id", protectRoute, sendMessage);

module.exports = messageRouter;