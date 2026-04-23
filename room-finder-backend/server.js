require("dotenv").config();

const express = require("express");
const fs = require("fs");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const https = require("https");
const Room = require("./models/Room");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/roomsathi";
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "");
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }

    cb(new Error("Only image files are allowed"));
  },
});

function parseMessAvailable(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function getRoomLocation(source = {}) {
  return String(source.location || source.area || "").trim();
}

function normalizeExistingImages(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (_error) {
    return [];
  }
}

function getUploadedImagePaths(files) {
  return (files || []).map((file) => `/uploads/${file.filename}`);
}

function getFinalImages(req, existingImages = []) {
  const uploadedImages = getUploadedImagePaths(req.files);
  if (uploadedImages.length) {
    return uploadedImages;
  }

  const keptImages = normalizeExistingImages(req.body.existingImages);
  if (keptImages.length) {
    return keptImages;
  }

  if (existingImages.length) {
    return existingImages;
  }

  if (typeof req.body.image === "string" && req.body.image.trim()) {
    return [req.body.image.trim()];
  }

  return ["https://via.placeholder.com/150"];
}

function deleteUploadedFiles(imagePaths) {
  (imagePaths || []).forEach((imagePath) => {
    if (!imagePath || !imagePath.startsWith("/uploads/")) {
      return;
    }

    const filename = path.basename(imagePath);
    const filePath = path.join(uploadsDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
}

function serializeRoom(room) {
  const plain = room.toJSON ? room.toJSON() : room;
  return {
    ...plain,
    area: plain.area || plain.location,
    location: plain.location || plain.area,
  };
}

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

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(uploadsDir));

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("Connection Error", err));

app.get("/", (_req, res) => {
  res.send("Server is running successfully");
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "room-finder-backend",
    port: PORT,
    mongoState: mongoose.connection.readyState,
  });
});

app.get("/rooms", async (req, res) => {
  try {
    const location = getRoomLocation(req.query);
    const query = {};

    if (location) {
      query.location = new RegExp(`^${location}$`, "i");
    }

    const rooms = await Room.find(query).sort({ createdAt: -1 });
    res.json(rooms.map(serializeRoom));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch rooms", error: error.message });
  }
});

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
      geometry: best.geometry,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error while calculating route." });
  }
});

app.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    res.json({ message: "Welcome to RoomSathi! Login successful." });
  } catch (error) {
    res.status(500).json({ message: "Server error during login." });
  }
});

app.post('/signup', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    res.status(201).json({ message: "Account created successfully! Please login." });
  } catch (error) {
    res.status(500).json({ message: "Server error during signup." });
  }
});

app.get("/rooms/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid room ID" });
    }

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json(serializeRoom(room));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch room", error: error.message });
  }
});

app.post("/rooms", upload.array("imageFiles", 6), async (req, res) => {
  try {
    const { name, price, ownerContact, messAvailable } = req.body;
    const location = getRoomLocation(req.body);

    if (!name || !price || !location || !ownerContact) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (Number(price) <= 0) {
      return res.status(400).json({ message: "Price must be a positive number" });
    }

    const images = getFinalImages(req);

    const newRoom = await Room.create({
      name,
      price: Number(price),
      location,
      ownerContact,
      messAvailable: parseMessAvailable(messAvailable),
      image: images[0],
      images,
    });

    res.status(201).json({
      message: "Room added successfully",
      room: serializeRoom(newRoom),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to add room", error: error.message });
  }
});

app.put("/rooms/:id", upload.array("imageFiles", 6), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid room ID" });
    }

    const { name, price, ownerContact, messAvailable } = req.body;
    const location = getRoomLocation(req.body);

    if (!name || !price || !location || !ownerContact) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (Number(price) <= 0) {
      return res.status(400).json({ message: "Price must be a positive number" });
    }

    const existingRoom = await Room.findById(req.params.id);

    if (!existingRoom) {
      return res.status(404).json({ message: "Room not found" });
    }

    const previousImages =
      existingRoom.images && existingRoom.images.length
        ? existingRoom.images
        : [existingRoom.image].filter(Boolean);
    const nextImages = getFinalImages(req, previousImages);
    const replacedWithNewUploads = getUploadedImagePaths(req.files).length > 0;

    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      {
        name,
        price: Number(price),
        location,
        ownerContact,
        messAvailable: parseMessAvailable(messAvailable),
        image: nextImages[0],
        images: nextImages,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (replacedWithNewUploads) {
      deleteUploadedFiles(previousImages);
    }

    res.json({
      message: "Room updated successfully",
      room: serializeRoom(updatedRoom),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update room", error: error.message });
  }
});

app.delete("/rooms/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid room ID" });
    }

    const deletedRoom = await Room.findByIdAndDelete(req.params.id);

    if (!deletedRoom) {
      return res.status(404).json({ message: "Room not found" });
    }

    const imagesToDelete =
      deletedRoom.images && deletedRoom.images.length
        ? deletedRoom.images
        : [deletedRoom.image].filter(Boolean);
    deleteUploadedFiles(imagesToDelete);

    res.json({
      message: "Room deleted successfully",
      room: serializeRoom(deletedRoom),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete room", error: error.message });
  }
});

app.use((error, _req, res, next) => {
  if (!error) {
    next();
    return;
  }

  res.status(400).json({ message: error.message || "Request failed" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
