const mongoose = require("mongoose");

// Cache the connection to prevent multiple connections in serverless environments (Vercel)
let cachedConnection = null;

const connectDB = async () => {
  // If we have a connected instance, reuse it
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  try {
    const uri = process.env.MONGO_URI;
    
    if (!uri) {
      throw new Error("MONGO_URI is missing. Please add it to your Vercel Environment Variables.");
    }

    // Critical check for Vercel deployment
    if (process.env.VERCEL && (uri.includes('127.0.0.1') || uri.includes('localhost'))) {
      console.warn("⚠️ VERCEL DETECTED: Local MongoDB URI found. Production requires MongoDB Atlas.");
    }

    console.log(`📡 Connecting to MongoDB...`);
    
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    if (!process.env.VERCEL) process.exit(1);
    throw error;
  }
};

module.exports = connectDB;
