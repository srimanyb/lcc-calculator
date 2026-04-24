const mongoose = require("mongoose");

const connectDB = async () => {
  // Prevent multiple connections in serverless environments
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }
  
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Modern Mongoose 8 options (most are default now, but keeping it explicit)
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:");
    console.error(`   Message: ${error.message}`);
    console.error(`   URI: ${process.env.MONGO_URI ? process.env.MONGO_URI.split('@').pop() : 'undefined'}`); // Hide credentials but show host
    
    // Exit only if NOT in a Vercel serverless environment
    if (!process.env.VERCEL) {
      console.error("   Shutting down server due to database connection failure...");
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;
