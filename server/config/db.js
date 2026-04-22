const mongoose = require("mongoose");

const connectDB = async () => {
  // Prevent multiple connections in serverless environments
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    // Exit only if NOT in a Vercel serverless environment
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
