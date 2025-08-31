const User = require("../models/User");
const bcrypt = require("bcrypt");
const { generateToken } = require("../lib/utils");
const cloudinary = require("cloudinary").v2;


// Controller to signup a new user
const signupController = async (req, res) => {
    try {
        const { fullName, email, password, bio } = req.body; 
        
        if (!fullName || !email || !password || !bio) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }
        
        const userData = await User.findOne({ email });

        if (userData) {
            return res.status(400).json({ success: false, message: "Account already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = await User.create({ fullName, email, password: hashedPassword, bio });

        const token = generateToken(newUser._id);   

        res.status(201).json({ success: true, message: "Account created successfully", userData: newUser, token});
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}


// Controller to login a user
const loginController = async (req, res) => {
    try {
        const { email, password } = req.body; 
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }
        
        const userData = await User.findOne({ email });

        if (!userData) {
            return res.status(400).json({ success: false, message: "Account does not exist" });
        }

        const isPasswordValid = await bcrypt.compare(password, userData.password);

        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: "Invalid password" });
        }

        const token = generateToken(userData._id);   

        res.status(200).json({ success: true, message: "Login successful", userData: userData, token});
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}


// Controller to check if user is authenticated
const checkAuthController = async (req, res) => {
    res.status(200).json({ success: true, user: req.user });
}


// Controller to update user profile details
const updateProfileController = async (req, res) => {
    try {
        const {profilePic, fullName, bio } = req.body; 
        
        const userId = req.user._id;
        let updatedData = {};
        
        if (!profilePic) {
            updatedData = await User.findByIdAndUpdate(userId, { bio, fullName }, { new: true });
        } else {
            const uploadResponse = await cloudinary.uploader.upload(profilePic, {
                folder: "chat-app/profile-pictures",
                resource_type: "image"
            });
            if (!uploadResponse.secure_url) {
                throw new Error("Image upload failed");
            }
            updatedData = await User.findByIdAndUpdate(userId, { 
                bio, 
                fullName, 
                profilePic: uploadResponse.secure_url 
            }, { new: true });
        }
        const userData = await updatedData;

        res.status(200).json({ success: true, message: "Profile updated successfully", userData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}


module.exports = { 
    signupController, 
    loginController, 
    checkAuthController, 
    updateProfileController 
};