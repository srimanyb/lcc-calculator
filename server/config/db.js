const mongoose = require("mongoose");

/**
 * Senior Full-Stack Engineer Refactor:
 * Ensures a robust MongoDB connection with proper error handling and monitoring.
 */
const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    
    if (!uri) {
      throw new Error("MONGO_URI is not defined in the environment variables.");
    }

    // Inform user if they are using local DB in a production-like environment
    if (process.env.VERCEL && (uri.includes('127.0.0.1') || uri.includes('localhost'))) {
      console.warn("⚠️ WARNING: You are using a local MongoDB URI on Vercel. This will NOT work.");
      console.warn("👉 Please set MONGO_URI to a MongoDB Atlas connection string in your Vercel Dashboard.");
    }

    console.log(`📡 Attempting to connect to MongoDB...`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: true, // Wait for connection instead of failing immediately
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Monitor connection events for long-term stability
    mongoose.connection.on('error', err => {
      console.error('❌ MongoDB post-connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB Disconnected. Check your network or database status.');
    });

    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    
    // In local development, we exit to let the developer fix the issue.
    // In serverless (Vercel), we throw to let the platform handle it.
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;
