require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");
const path = require("path");

const roomRoutes = require("./routes/roomRoutes");
const authRoutes = require("./routes/authRoutes");
const mapsRoutes = require("./routes/mapsRoutes");
const fs = require("fs");

const app = express();
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet());

// Implement CORS
app.use(cors());

// Rate limiting: Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!"
});
app.use("/api", limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));

// Data sanitization against XSS
app.use(xss());

// Serving static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 2) ROUTES
app.use("/api/rooms", roomRoutes);
app.use("/api/v1/rooms", roomRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/maps", mapsRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "success", message: "Server is healthy" });
});

// 3) ERROR HANDLING
app.all("*", (req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

// 4) DATABASE CONNECTION
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/roomsathi";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
