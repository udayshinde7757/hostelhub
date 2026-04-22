require("dotenv").config();

const express = require("express");
const fs = require("fs");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const Room = require("./models/Room");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "");
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
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
  } catch (error) {
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

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(uploadsDir));

if (!MONGODB_URI) {
  console.log("Missing MONGODB_URI in environment variables");
}

if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log("Connection Error", err));
}

app.get("/", (req, res) => {
  res.send("Server is running successfully");
});

app.get("/rooms", async (req, res) => {
  try {
    const location = req.query.location;
    const query = {};

    if (location) {
      query.location = new RegExp(`^${location}$`, "i");
    }

    const rooms = await Room.find(query).sort({ createdAt: -1 });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch rooms", error: error.message });
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

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch room", error: error.message });
  }
});

app.post("/rooms", upload.array("imageFiles", 6), async (req, res) => {
  try {
    const { name, price, location, ownerContact, messAvailable } = req.body;

    if (!name || !price || !location || !ownerContact) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const images = getFinalImages(req);

    const newRoom = await Room.create({
      name,
      price,
      location,
      ownerContact,
      messAvailable: parseMessAvailable(messAvailable),
      image: images[0],
      images,
    });

    res.status(201).json({
      message: "Room added successfully",
      room: newRoom,
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

    const { name, price, location, ownerContact, messAvailable } = req.body;

    if (!name || !price || !location || !ownerContact) {
      return res.status(400).json({ message: "All fields are required" });
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
        price,
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
      room: updatedRoom,
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
      room: deletedRoom,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete room", error: error.message });
  }
});

app.use((error, req, res, next) => {
  if (!error) {
    next();
    return;
  }

  res.status(400).json({ message: error.message || "Request failed" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
