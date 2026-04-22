require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Room = require("./models/Room");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(express.json());
app.use(cors());

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

app.post("/rooms", async (req, res) => {
  try {
    const { name, price, location, image } = req.body;

    if (!name || !price || !location) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newRoom = await Room.create({
      name,
      price,
      location,
      image: image || "https://via.placeholder.com/150",
    });

    res.status(201).json({
      message: "Room added successfully",
      room: newRoom,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to add room", error: error.message });
  }
});

app.put("/rooms/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid room ID" });
    }

    const { name, price, location, image } = req.body;

    if (!name || !price || !location) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      {
        name,
        price,
        location,
        image: image || "https://via.placeholder.com/150",
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedRoom) {
      return res.status(404).json({ message: "Room not found" });
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

    res.json({
      message: "Room deleted successfully",
      room: deletedRoom,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete room", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
