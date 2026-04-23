const mongoose = require("mongoose");

/**
 * connectDB – Connects to MongoDB using the URI from the .env file.
 * Logs success/failure clearly so beginners can see what is happening.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options are the recommended safe defaults for Mongoose 7+
      serverSelectionTimeoutMS: 5000, // Give up after 5 s if no server found
    });

    console.log(`✅  MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌  MongoDB Connection Failed: ${error.message}`);
    // Exit the process so nodemon restarts cleanly instead of a zombie server
    process.exit(1);
  }

  // Handle connection events after initial connect
  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️   MongoDB disconnected.");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("🔄  MongoDB reconnected.");
  });
};

module.exports = connectDB;
