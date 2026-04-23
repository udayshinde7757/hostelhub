const express = require("express");
const router = express.Router();

const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require("../controllers/roomController");

// GET  /rooms            → list all rooms (with optional filters)
router.get("/", getAllRooms);

// GET  /rooms/:id        → get one room by MongoDB ObjectId
router.get("/:id", getRoomById);

// POST /rooms            → create a new room
router.post("/", createRoom);

// PUT  /rooms/:id        → update an existing room
router.put("/:id", updateRoom);

// DELETE /rooms/:id      → remove a room
router.delete("/:id", deleteRoom);

module.exports = router;
