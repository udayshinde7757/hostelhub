const axios = require("axios");
const Room = require("../models/Room");
const RoomAnalytics = require("../models/RoomAnalytics");
const { uploadToCloudinary } = require("../utils/cloudinaryHelper");

function splitList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== "string") return value;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRoomPayload(body = {}) {
  const roomData = { ...body };
  if (!roomData.title && roomData.name) roomData.title = roomData.name;
  if (!roomData.area && roomData.location) roomData.area = roomData.location;
  if (!roomData.location && roomData.area) roomData.location = roomData.area;
  if (!roomData.whatsappNumber && roomData.ownerContact) {
    roomData.whatsappNumber = roomData.ownerContact;
  }
  const amenities = splitList(roomData.amenities);
  const facilities = splitList(roomData.facilities);
  if (amenities !== undefined) roomData.amenities = amenities;
  else delete roomData.amenities;
  if (facilities !== undefined) roomData.facilities = facilities;
  else delete roomData.facilities;
  if (!roomData.facilities && roomData.amenities) roomData.facilities = roomData.amenities;
  if (!roomData.amenities && roomData.facilities) roomData.amenities = roomData.facilities;
  if (typeof roomData.price === "string" && roomData.price.trim() !== "") {
    roomData.price = Number(roomData.price);
  }
  return roomData;
}

function hasCloudinaryConfig() {
  return Boolean(process.env.CLOUD_NAME && process.env.CLOUD_API_KEY && process.env.CLOUD_API_SECRET);
}

function localUploadUrl(req, file) {
  return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
}

async function buildUploadedImages(req) {
  if (!req.files || req.files.length === 0) return undefined;
  return Promise.all(
    req.files.map(async (file) => {
      if (hasCloudinaryConfig()) {
        try {
          const upload = await uploadToCloudinary(file.buffer || file.path);
          return { url: upload.secure_url, public_id: upload.public_id };
        } catch (error) {
          console.error("Cloudinary upload failed, using local image:", error.message);
        }
      }
      return { url: localUploadUrl(req, file), public_id: file.filename };
    })
  );
}

function setNoStore(res) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5;
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

exports.getAllRooms = async (req, res) => {
  try {
    const { area, minPrice, maxPrice, keyword, sortBy } = req.query;
    const query = {};
    if (area) query.area = new RegExp(`^${area}$`, "i");
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { area: { $regex: keyword, $options: "i" } },
      ];
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    let sortOptions = { createdAt: -1 };
    if (sortBy === "price_asc") sortOptions = { price: 1 };
    else if (sortBy === "most_viewed") sortOptions = { clickCount: -1 };
    else if (sortBy === "newest") sortOptions = { createdAt: -1 };

    const rooms = await Room.find(query).sort(sortOptions);
    setNoStore(res);
    res.json({ success: true, data: rooms, results: rooms.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRecommendedRooms = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const userLat = lat ? Number(lat) : 21.1458;
    const userLng = lng ? Number(lng) : 79.0882;
    const rooms = await Room.find();
    const maxPrice = Math.max(...rooms.map(r => r.price), 10000);
    const scoredRooms = rooms.map(room => {
      const distance = calculateDistance(userLat, userLng, room.coordinates?.lat, room.coordinates?.lng);
      const distanceScore = 1 / (1 + distance);
      const priceScore = (maxPrice - room.price) / maxPrice;
      const ratingScore = (room.rating || 0) / 5;
      const facilityScore = Math.min((room.facilities?.length || 0) / 5, 1);
      const totalScore = (0.4 * distanceScore) + (0.3 * priceScore) + (0.2 * ratingScore) + (0.1 * facilityScore);
      return { ...room.toJSON(), score: totalScore, calculatedDistance: distance.toFixed(2) };
    });
    const recommended = scoredRooms.sort((a, b) => b.score - a.score).slice(0, 6);
    res.json({ success: true, data: recommended });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });
    RoomAnalytics.findOneAndUpdate({ roomId: room._id }, { $inc: { views: 1 } }, { upsert: true }).catch(() => {});
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: rooms, results: rooms.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const roomCount = await Room.countDocuments({ owner: req.user.id, createdAt: { $gte: twentyFourHoursAgo } });
    if (roomCount >= 5) return res.status(429).json({ success: false, message: "Limit: Max 5 posts/day." });

    const roomData = normalizeRoomPayload(req.body);
    const images = await buildUploadedImages(req);
    if (images) roomData.images = images;
    if (!roomData.images || roomData.images.length === 0) return res.status(400).json({ success: false, message: "1+ image required." });
    
    const waRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    if (!roomData.whatsappNumber || !waRegex.test(roomData.whatsappNumber.replace(/\s/g, ""))) {
      return res.status(400).json({ success: false, message: "Valid 10-digit WhatsApp required." });
    }

    const duplicate = await Room.findOne({ title: roomData.title, address: roomData.address, owner: req.user.id });
    if (duplicate) return res.status(409).json({ success: false, message: "Duplicate post detected." });

    if (roomData.address && (!roomData.coordinates || !roomData.coordinates.lat)) {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        try {
          const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(roomData.address)}&key=${apiKey}`);
          if (response.data.status === "OK") {
            const loc = response.data.results[0].geometry.location;
            roomData.coordinates = { lat: loc.lat, lng: loc.lng };
          }
        } catch (e) {}
      }
    }

    roomData.owner = req.user.id;
    const newRoom = await Room.create(roomData);
    res.status(201).json({ success: true, data: newRoom });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });
    if (room.owner.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    const updateData = normalizeRoomPayload(req.body);
    const images = await buildUploadedImages(req);
    if (images) updateData.images = images;
    const updatedRoom = await Room.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.json({ success: true, data: updatedRoom });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });
    if (room.owner.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    await Room.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.uploadRoomImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: "No images" });
    const imageUrls = req.files.map(file => localUploadUrl(req, file));
    res.status(200).json({ success: true, data: { images: imageUrls } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateRoomStatus = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });
    if (room.owner.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    room.status = room.status === "available" ? "booked" : "available";
    await room.save();
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.trackWhatsAppClick = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });
    room.clickCount += 1;
    if (room.status === "available") room.status = "inquiry";
    await room.save();
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getLatestRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 }).limit(6);
    setNoStore(res);
    res.json({ success: true, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTrendingRooms = async (req, res) => {
  try {
    const analytics = await RoomAnalytics.find().sort({ views: -1 }).limit(6);
    const roomIds = analytics.map(a => a.roomId);
    const rooms = await Room.find({ _id: { $in: roomIds } });
    const sortedRooms = roomIds.map(id => rooms.find(r => r._id.toString() === id.toString())).filter(Boolean);
    res.json({ success: true, data: sortedRooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
