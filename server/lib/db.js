const e = require("express");
const mongoose = require("mongoose");

// function to connect to the mongodb database

const connectToDB = async () => {
    try{
        mongoose.connection.on("connected", () => {
            console.log("Database connected");
        });
        
        await mongoose.connect(`${process.env.MONGO_URI}/ChatApp`, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    }catch(error){
        console.log("Database connection error", error);
    }
}

module.exports = { connectToDB };