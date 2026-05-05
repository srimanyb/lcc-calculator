const mongoose = require("mongoose");

// Cache the connection globally to prevent multiple connections in Vercel serverless functions
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // 1. If already connected, return
  if (cached.conn) {
    return cached.conn;
  }

  // 2. If a connection is not in progress, start one
  if (!cached.promise) {
    const uri = process.env.MONGO_URI || "mongodb+srv://sriman:Sriman%4010@cluster0.vs6trum.mongodb.net/menumaster?retryWrites=true&w=majority";
    
    if (!uri) {
      throw new Error("MONGO_URI is missing. Please add it to your Vercel Environment Variables.");
    }

    // Critical check for Vercel deployment
    if (process.env.VERCEL && (uri.includes('127.0.0.1') || uri.includes('localhost'))) {
      console.warn("⚠️ VERCEL DETECTED: Local MongoDB URI found. Production requires MongoDB Atlas.");
    }

    console.log(`📡 Connecting to MongoDB...`);
    
    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false, // Critical for Vercel to fail fast instead of hanging
    }).then((mongoose) => {
      console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
      return mongoose.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null; // Clear on error to allow retry
    console.error("❌ MongoDB connection error:", error.message);
    if (!process.env.VERCEL) process.exit(1);
    throw error;
  }
};

module.exports = connectDB;
