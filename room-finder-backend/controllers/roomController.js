const axios = require("axios");
const Room = require("../models/Room");

// ─────────────────────────────────────────────
// Helper – Haversine distance formula (in km)
// ─────────────────────────────────────────────
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5; // Default 5km if missing
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─────────────────────────────────────────────
// GET /rooms (with Pagination and Filtering)
// ─────────────────────────────────────────────
exports.getAllRooms = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, location, minPrice, maxPrice } = req.query;
    const query = {};

    if (location) {
      query.location = new RegExp(`^${location}$`, "i");
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
    };

    const result = await Room.paginate(query, options);

    res.json({
      status: "success",
      results: result.docs.length,
      total: result.totalDocs,
      pages: result.totalPages,
      currentPage: result.page,
      data: {
        rooms: result.docs,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /rooms/recommended
// Smart Recommendation Engine
// ─────────────────────────────────────────────
exports.getRecommendedRooms = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const userLat = lat ? Number(lat) : 21.1458; // Default Nagpur center
    const userLng = lng ? Number(lng) : 79.0882;

    const rooms = await Room.find();
    
    // Calculate max price for normalization
    const maxPrice = Math.max(...rooms.map(r => r.price), 10000);

    const scoredRooms = rooms.map(room => {
      // 1. Distance Score (0.4)
      const distance = calculateDistance(userLat, userLng, room.coordinates?.lat, room.coordinates?.lng);
      const distanceScore = 1 / (1 + distance);

      // 2. Price Score (0.3)
      const priceScore = (maxPrice - room.price) / maxPrice;

      // 3. Rating Score (0.2)
      const ratingScore = (room.rating || 0) / 5;

      // 4. Facility Score (0.1)
      // Normalize based on number of amenities (max assumed 10)
      const facilityScore = Math.min((room.amenities?.length || 0) / 5, 1);

      // Final Weighted Score
      const totalScore = (0.4 * distanceScore) + (0.3 * priceScore) + (0.2 * ratingScore) + (0.1 * facilityScore);

      return {
        ...room.toJSON(),
        score: totalScore,
        calculatedDistance: distance.toFixed(2)
      };
    });

    // Sort by score descending and take top 6
    const recommended = scoredRooms.sort((a, b) => b.score - a.score).slice(0, 6);

    res.json({
      status: "success",
      data: {
        rooms: recommended,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ status: "fail", message: "Room not found" });
    res.json({ status: "success", data: { room } });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const roomData = { ...req.body };
    
    // Geocode address if provided
    if (roomData.address && (!roomData.coordinates || !roomData.coordinates.lat)) {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        try {
          const response = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(roomData.address)}&key=${apiKey}`
          );
          if (response.data.status === "OK") {
            const location = response.data.results[0].geometry.location;
            roomData.coordinates = {
              lat: location.lat,
              lng: location.lng
            };
          }
        } catch (geocodeError) {
          console.error("Geocoding failed during room creation:", geocodeError.message);
          // Proceed without coordinates or handle error based on requirements
        }
      }
    }

    const newRoom = await Room.create(roomData);
    res.status(201).json({ status: "success", data: { room: newRoom } });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const updatedRoom = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedRoom) return res.status(404).json({ status: "fail", message: "Room not found" });
    res.json({ status: "success", data: { room: updatedRoom } });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const deletedRoom = await Room.findByIdAndDelete(req.params.id);
    if (!deletedRoom) return res.status(404).json({ status: "fail", message: "Room not found" });
    res.json({ status: "success", data: null });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

exports.uploadRoomImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ status: "fail", message: "No images uploaded" });
    }

    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);

    res.status(200).json({
      status: "success",
      data: {
        images: imageUrls
      }
    });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

exports.bookRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ status: "fail", message: "Room not found" });
    }

    if (room.availableRooms <= 0) {
      return res.status(400).json({ status: "fail", message: "Fully Occupied" });
    }

    room.availableRooms -= 1;
    await room.save();

    res.status(200).json({
      status: "success",
      message: "Room booked successfully!",
      data: { room }
    });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};
