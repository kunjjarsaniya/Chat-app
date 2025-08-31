const express = require("express");
const userRouter = express.Router();

const { protectRoute } = require("../middleware/auth");
const { signupController, loginController, checkAuthController, updateProfileController } = require("../controllers/userController");

// Routes
userRouter.post("/signup", signupController);
userRouter.post("/login", loginController);
userRouter.put("/update-profile", protectRoute, updateProfileController);
userRouter.get("/check-auth", protectRoute, checkAuthController);

module.exports = userRouter;