const mongoose = require("mongoose");

// Global configuration
mongoose.set('bufferCommands', false); // Fail fast instead of waiting 10s

const connectDB = async () => {
  // Prevent multiple connections in serverless environments
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }
  
  const uri = process.env.MONGO_URI;
  
  try {
    console.log(`📡 Attempting to connect to MongoDB...`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:");
    console.error(`   Message: ${error.message}`);
    console.error(`   URI: ${uri ? uri.replace(/:([^:@]+)@/, ':****@') : 'MISSING'}`); 
    
    if (uri && uri.includes('127.0.0.1')) {
      console.warn("   💡 TIP: If using local MongoDB, ensure the service is running (Check Windows Services).");
    }
    
    if (!process.env.VERCEL) {
      console.error("   Shutting down server due to database connection failure...");
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;
