const mongoose = require("mongoose");

// Cache the connection promise to prevent multiple simultaneous connection attempts
let cachedPromise = null;

const connectDB = async () => {
  // 1. If already connected, return
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // 2. If a connection is already in progress, wait for it
  if (cachedPromise) {
    return cachedPromise;
  }

  try {
    const uri = process.env.MONGO_URI || "mongodb+srv://sriman:Sriman%4010@cluster0.vs6trum.mongodb.net/menumaster?retryWrites=true&w=majority";
    
    if (!uri) {
      throw new Error("MONGO_URI is missing. Please add it to your Vercel Environment Variables.");
    }

    // Critical check for Vercel deployment
    if (process.env.VERCEL && (uri.includes('127.0.0.1') || uri.includes('localhost'))) {
      console.warn("⚠️ VERCEL DETECTED: Local MongoDB URI found. Production requires MongoDB Atlas.");
    }

    console.log(`📡 Connecting to MongoDB...`);
    
    cachedPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: true,
    });

    const conn = await cachedPromise;

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    return conn;
  } catch (error) {
    cachedPromise = null; // Clear on error to allow retry
    console.error("❌ MongoDB connection error:", error.message);
    if (!process.env.VERCEL) process.exit(1);
    throw error;
  }
};

module.exports = connectDB;
