require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const roomRoutes = require("./routes/roomRoutes");
const authRoutes = require("./routes/authRoutes");
const mapsRoutes = require("./routes/mapsRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const userRoutes = require("./routes/userRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// ─── GLOBAL MIDDLEWARES ───────────────────────
app.use(helmet());
app.use(cors());

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

app.use(express.json({ limit: "10kb" }));
app.use(xss());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── ROUTES ──────────────────────────────────
app.use("/api/rooms", roomRoutes);
app.use("/api/v1/rooms", roomRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/maps", mapsRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/bookings", bookingRoutes);

// ─── NEARBY PLACES (Google Maps proxy) ───────
app.get("/api/nearby", async (req, res) => {
  const { lat, lng } = req.query;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
  if (!lat || !lng || !apiKey) {
    return res.status(400).json({ error: "lat, lng, and Google API key required" });
  }

  const types = [
    { type: "university", label: "college" },
    { type: "hospital",   label: "hospital" },
    { type: "bus_station", label: "transport" },
  ];

  async function getDistanceAndTime(origin, destination) {
    try {
      const response = await axios.get(
        "https://maps.googleapis.com/maps/api/distancematrix/json",
        { params: { origins: `${origin.lat},${origin.lng}`, destinations: `${destination.lat},${destination.lng}`, key: apiKey } }
      );
      const element = response.data.rows[0].elements[0];
      return {
        distance: element.distance?.text || null,
        duration: element.duration?.text || null,
      };
    } catch {
      return { distance: null, duration: null };
    }
  }

  try {
    const origin = { lat, lng };
    const results = await Promise.all(
      types.map(async ({ type, label }) => {
        const placesRes = await axios.get(
          "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
          { params: { location: `${lat},${lng}`, radius: 2000, type, key: apiKey } }
        );
        let places = placesRes.data.results.slice(0, 5);
        places = await Promise.all(
          places.map(async (place) => {
            const dest = { lat: place.geometry.location.lat, lng: place.geometry.location.lng };
            const { distance, duration } = await getDistanceAndTime(origin, dest);
            return { name: place.name, address: place.vicinity || place.formatted_address, rating: place.rating, type: label, distance, duration };
          })
        );
        return { type: label, places };
      })
    );
    const response = {};
    results.forEach(({ type, places }) => { response[type] = places; });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── HEALTH CHECK ─────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({ status: "success", message: "Server is healthy" });
});

// ─── 404 HANDLER ─────────────────────────────
app.all("*", (req, res) => {
  res.status(404).json({ success: false, message: `Can't find ${req.originalUrl} on this server!` });
});

// ─── CENTRALIZED ERROR HANDLER ────────────────
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error("❌ Server Error:", err.stack || err.message);

  // Handle Multer errors specifically
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "File too large. Maximum size is 2MB." });
  }
  if (err.message && err.message.startsWith("Error: Images Only")) {
    return res.status(400).json({ success: false, message: err.message });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
