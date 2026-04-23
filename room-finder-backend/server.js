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

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(uploadsDir));

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("Connection Error", err));

function getRoomLocation(source = {}) {
  return String(source.location || source.area || "").trim();
}

function serializeRoom(room) {
  const plain = room.toJSON ? room.toJSON() : room;
  return {
    ...plain,
    area: plain.area || plain.location,
    location: plain.location || plain.area,
  };
}

app.get("/", (req, res) => {
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
    const { name, price, location, image } = req.body;

    if (!name || !price || !location || !ownerContact) {
      return res.status(400).json({ message: "All fields are required" });
    }

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

    const { name, price, location, image } = req.body;

    if (!name || !price || !location || !ownerContact) {
      return res.status(400).json({ message: "All fields are required" });
    }

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
