const Room = require("../models/Room");

// ─────────────────────────────────────────────
// Helper – pull location from query / body
// Accepts both "location" and "area" so old
// frontend code keeps working without changes.
// ─────────────────────────────────────────────
function extractLocation(source = {}) {
  return String(source.location || source.area || "").trim();
}

// ─────────────────────────────────────────────
// GET /rooms
// Fetches all rooms. Supports optional filters:
//   ?location=Nagpur
//   ?area=Dharampeth
//   ?minPrice=1000&maxPrice=5000
// ─────────────────────────────────────────────
const getAllRooms = async (req, res, next) => {
  try {
    const query = {};

    // Location / area filter
    const location = extractLocation(req.query);
    if (location) {
      // Case-insensitive exact match (anchors ^ and $)
      query.location = new RegExp(`^${location}$`, "i");
    }

    // Price range filter
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      query.price = {};
      if (req.query.minPrice !== undefined) {
        const min = Number(req.query.minPrice);
        if (isNaN(min)) {
          return res
            .status(400)
            .json({ success: false, message: "minPrice must be a number" });
        }
        query.price.$gte = min;
      }
      if (req.query.maxPrice !== undefined) {
        const max = Number(req.query.maxPrice);
        if (isNaN(max)) {
          return res
            .status(400)
            .json({ success: false, message: "maxPrice must be a number" });
        }
        query.price.$lte = max;
      }
    }

    const rooms = await Room.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: rooms.length,
      rooms,
    });
  } catch (error) {
    next(error); // Pass to global error handler
  }
};

// ─────────────────────────────────────────────
// GET /rooms/:id
// Fetch a single room by its MongoDB ObjectId
// ─────────────────────────────────────────────
const getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res
        .status(404)
        .json({ success: false, message: "Room not found" });
    }

    res.json({ success: true, room });
  } catch (error) {
    // If the id format is wrong mongoose throws a CastError
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid room ID format" });
    }
    next(error);
  }
};

// ─────────────────────────────────────────────
// POST /rooms
// Create a new room
// Required body fields: name, price, location (or area)
// ─────────────────────────────────────────────
const createRoom = async (req, res, next) => {
  try {
    const { name, price, image, rating, reviews, amenities, description } =
      req.body;
    const location = extractLocation(req.body);

    // ── Validation ──────────────────────────
    if (!name || String(name).trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Room name is required" });
    }

    if (price === undefined || price === null || price === "") {
      return res
        .status(400)
        .json({ success: false, message: "Room price is required" });
    }

    if (isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid positive number",
      });
    }

    if (!location) {
      return res.status(400).json({
        success: false,
        message: "Location / area is required",
      });
    }
    // ─────────────────────────────────────────

    const newRoom = await Room.create({
      name: String(name).trim(),
      price: Number(price),
      location,
      image: image ? String(image).trim() : undefined,
      rating: rating !== undefined ? Number(rating) : undefined,
      reviews: reviews !== undefined ? Number(reviews) : undefined,
      amenities: Array.isArray(amenities) ? amenities : undefined,
      description: description ? String(description).trim() : undefined,
    });

    res.status(201).json({
      success: true,
      message: "Room added successfully!",
      room: newRoom,
    });
  } catch (error) {
    // Mongoose validation errors (e.g. required field missing)
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    next(error);
  }
};

// ─────────────────────────────────────────────
// PUT /rooms/:id
// Update an existing room
// ─────────────────────────────────────────────
const updateRoom = async (req, res, next) => {
  try {
    const { name, price, image, rating, reviews, amenities, description } =
      req.body;
    const location = extractLocation(req.body);

    // Build the update object – only include fields that were sent
    const updates = {};

    if (name !== undefined) {
      if (String(name).trim() === "") {
        return res
          .status(400)
          .json({ success: false, message: "Room name cannot be empty" });
      }
      updates.name = String(name).trim();
    }

    if (price !== undefined) {
      if (isNaN(Number(price)) || Number(price) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid positive number",
        });
      }
      updates.price = Number(price);
    }

    if (location) updates.location = location;
    if (image !== undefined) updates.image = String(image).trim();
    if (rating !== undefined) updates.rating = Number(rating);
    if (reviews !== undefined) updates.reviews = Number(reviews);
    if (amenities !== undefined)
      updates.amenities = Array.isArray(amenities) ? amenities : [];
    if (description !== undefined)
      updates.description = String(description).trim();

    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,          // Return the updated document
        runValidators: true, // Run schema validation on update
      }
    );

    if (!updatedRoom) {
      return res
        .status(404)
        .json({ success: false, message: "Room not found" });
    }

    res.json({
      success: true,
      message: "Room updated successfully!",
      room: updatedRoom,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid room ID format" });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    next(error);
  }
};

// ─────────────────────────────────────────────
// DELETE /rooms/:id
// Delete a room by its ObjectId
// ─────────────────────────────────────────────
const deleteRoom = async (req, res, next) => {
  try {
    const deletedRoom = await Room.findByIdAndDelete(req.params.id);

    if (!deletedRoom) {
      return res
        .status(404)
        .json({ success: false, message: "Room not found" });
    }

    res.json({
      success: true,
      message: "Room deleted successfully!",
      room: deletedRoom,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid room ID format" });
    }
    next(error);
  }
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};
