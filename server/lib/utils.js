const jwt = require("jsonwebtoken");

// Function to generate a token for a user
const generateToken = (user) => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    return token;
}

module.exports = { generateToken };
