const RoomAnalytics = require('../models/RoomAnalytics');
const Room = require('../models/Room');

// ─────────────────────────────────────────────
// Increment view count when a room is opened
// ─────────────────────────────────────────────
exports.trackView = async (req, res) => {
  try {
    const { roomId } = req.params;

    await RoomAnalytics.findOneAndUpdate(
      { roomId },
      { $inc: { views: 1 } },
      { upsert: true, new: true }
    );

    res.status(200).json({ status: 'success', message: 'View tracked' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /analytics/top-rooms
// Most viewed rooms (bar chart data)
// ─────────────────────────────────────────────
exports.getTopRooms = async (req, res) => {
  try {
    const topAnalytics = await RoomAnalytics.find()
      .sort({ views: -1 })
      .limit(10)
      .populate('roomId', 'name location price');

    const data = topAnalytics
      .filter(a => a.roomId) // skip deleted rooms
      .map(a => ({
        roomId: a.roomId._id,
        name: a.roomId.name,
        location: a.roomId.location,
        price: a.roomId.price,
        views: a.views,
      }));

    res.status(200).json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /analytics/popular-locations
// Top 5 locations by room count (pie chart data)
// ─────────────────────────────────────────────
exports.getPopularLocations = async (req, res) => {
  try {
    const locations = await Room.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, location: '$_id', count: 1 } },
    ]);

    res.status(200).json({ status: 'success', data: locations });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /analytics/summary
// Combined stats for admin dashboard
// ─────────────────────────────────────────────
exports.getDashboardSummary = async (req, res) => {
  try {
    const [totalRooms, topRooms, popularLocations] = await Promise.all([
      Room.countDocuments(),
      RoomAnalytics.find().sort({ views: -1 }).limit(6).populate('roomId', 'name location'),
      Room.aggregate([
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, location: '$_id', count: 1 } },
      ]),
    ]);

    const totalViews = await RoomAnalytics.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } } },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalRooms,
        totalViews: totalViews[0]?.total || 0,
        topRooms: topRooms
          .filter(a => a.roomId)
          .map(a => ({ name: a.roomId.name, location: a.roomId.location, views: a.views })),
        popularLocations,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
