const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roomsathi';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors()); // Allow frontend to communicate without cross-origin errors
app.use(express.json()); // Parse JSON data arriving from frontend POST requests
app.use(express.static(path.join(__dirname))); // Serve index.html, css, js, images from this folder

// ============================================
// HELPERS (External API calls)
// ============================================
function httpsGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "RoomSathi/1.0 (local dev)",
          ...headers,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`Request failed (${res.statusCode || "unknown"})`));
          }
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error("Invalid JSON response"));
          }
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

// ============================================
// DATABASE SCHEMA (MongoDB)
// ============================================
const roomSchema = new mongoose.Schema({
  id: Number,
  name: { type: String, required: true },
  price: { type: Number, required: true },
  area: { type: String, required: true },
  rating: { type: Number, default: 4.0 },
  reviews: { type: Number, default: 0 },
  image: { type: String, default: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=800&q=80" }
});

const Room = mongoose.model('Room', roomSchema);

function getRoomArea(source = {}) {
  return String(source.area || source.location || '').trim();
}

function serializeRoom(room) {
  const plain = room.toObject ? room.toObject() : room;
  return {
    ...plain,
    location: plain.area,
  };
}

// ============================================
// INITIAL DUMMY DATA SEEDING (Optional)
// ============================================
// Seed initial data if db is empty
Room.countDocuments({}).then(count => {
  if (count === 0) {
    Room.insertMany([
      { id: 1, name: "Sunset Sky Hostel", price: 4500, area: "Dharampeth", rating: 4.8, reviews: 1284, image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80" },
      { id: 2, name: "Tile House Boys PG", price: 3200, area: "Manish Nagar", rating: 4.7, reviews: 932, image: "https://images.unsplash.com/photo-1502672260266-1c1de2424b9e?w=800&q=80" },
      { id: 3, name: "Urban Living Space", price: 5500, area: "Sitabuldi", rating: 4.6, reviews: 2104, image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80" },
      { id: 4, name: "Cozy Corner Rooms", price: 2800, area: "Sadar", rating: 4.9, reviews: 1567, image: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80" },
      { id: 5, name: "Tech Park Residence", price: 6000, area: "IT Park", rating: 4.5, reviews: 840, image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80" },
      { id: 6, name: "Student Hub Hostel", price: 3000, area: "Hingna", rating: 4.3, reviews: 500, image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80" }
    ]).then(() => console.log('Database seeded with dummy rooms.'));
  }
});

// ============================================
// API ROUTES
// ============================================

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'roomsathi-legacy-backend',
    port: PORT,
    mongoState: mongoose.connection.readyState,
  });
});

// 0. GET /geocode?q=... -> Convert destination text into lat/lng
app.get("/geocode", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Query parameter 'q' is required." });

    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=" +
      encodeURIComponent(q);

    const results = await httpsGetJson(url);
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(404).json({ error: "No matching location found." });
    }

    const first = results[0];
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(500).json({ error: "Geocoding returned an invalid coordinate." });
    }

    res.json({
      lat,
      lng,
      displayName: first.display_name || q,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error while geocoding location." });
  }
});

// 0b. GET /route?fromLat&fromLng&toLat&toLng&mode -> Optimal path between two points
app.get("/route", async (req, res) => {
  try {
    const fromLat = Number(req.query.fromLat);
    const fromLng = Number(req.query.fromLng);
    const toLat = Number(req.query.toLat);
    const toLng = Number(req.query.toLng);
    const modeRaw = String(req.query.mode || "driving");
    const mode = modeRaw === "walking" || modeRaw === "cycling" ? modeRaw : "driving";

    if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
      return res.status(400).json({ error: "fromLat, fromLng, toLat, toLng must be valid numbers." });
    }

    const osrmUrl =
      `https://router.project-osrm.org/route/v1/${mode}/` +
      `${encodeURIComponent(`${fromLng},${fromLat}`)};${encodeURIComponent(`${toLng},${toLat}`)}` +
      "?overview=full&geometries=geojson&steps=false";

    const data = await httpsGetJson(osrmUrl);
    const best = data?.routes?.[0];
    if (!best?.geometry?.coordinates?.length) {
      return res.status(502).json({ error: "Routing service returned no route." });
    }

    res.json({
      distanceMeters: Number(best.distance),
      durationSeconds: Number(best.duration),
      geometry: best.geometry, // GeoJSON LineString, coordinates are [lng,lat]
    });
  } catch (error) {
    res.status(500).json({ error: "Server error while calculating route." });
  }
});

// 1. GET /rooms -> Respond with the list of rooms
app.get('/rooms', async (req, res) => {
  try {
    const area = getRoomArea(req.query);
    const query = area ? { area: new RegExp(`^${area}$`, 'i') } : {};
    const rooms = await Room.find(query);
    res.json(rooms.map(serializeRoom));
  } catch (error) {
    res.status(500).json({ error: "Server error while fetching rooms." });
  }
});

app.get('/rooms/:id', async (req, res) => {
  try {
    const numericId = Number(req.params.id);
    const orConditions = [];

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      orConditions.push({ _id: req.params.id });
    }
    if (Number.isFinite(numericId)) {
      orConditions.push({ id: numericId });
    }

    if (orConditions.length === 0) {
      return res.status(400).json({ error: 'Invalid room id.' });
    }

    const room = await Room.findOne({ $or: orConditions });

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    res.json(serializeRoom(room));
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching room.' });
  }
});

// 2. POST /rooms -> Add a new room from the frontend form
app.post('/rooms', async (req, res) => {
  try {
    const { name, price, image } = req.body;
    const area = getRoomArea(req.body);

    // Backend Validation
    if (!name || !price || !area) {
      return res.status(400).json({ error: "Room Name, Price, and Area are required." });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: "Price must be a valid positive number." });
    }

    // Get highest ID for auto-increment logic
    const lastRoom = await Room.findOne().sort({ id: -1 });
    const newId = lastRoom && lastRoom.id ? lastRoom.id + 1 : 1;

    // Create the new room object in DB
    const newRoom = new Room({
      id: newId,
      name: name.trim(),
      price: Number(price),
      area: area,
      image: image ? image.trim() : undefined
    });

    await newRoom.save();
    
    // Respond back to frontend that it was successful
    res.status(201).json({ message: "Room added successfully!", room: newRoom });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error while adding room." });
  }
});

// 3. POST /login -> Mock user login
app.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // For now, accept any dummy login
    res.json({ message: "Welcome to RoomSathi! Login successful." });
  } catch (error) {
    res.status(500).json({ error: "Server error during login." });
  }
});

// 4. POST /signup -> Mock user signup
app.post('/signup', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // Accept dummy signup
    res.status(201).json({ message: "Account created successfully! Please login." });
  } catch (error) {
    res.status(500).json({ error: "Server error during signup." });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});
