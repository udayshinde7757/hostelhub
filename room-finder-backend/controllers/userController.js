const User = require("../models/User");
const Room = require("../models/Room");

exports.addToWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const roomId = req.params.roomId;

    if (!user.wishlist.includes(roomId)) {
      user.wishlist.push(roomId);
      await user.save();
    }

    res.status(200).json({ status: "success", data: { wishlist: user.wishlist } });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const roomId = req.params.roomId;

    user.wishlist = user.wishlist.filter(id => id.toString() !== roomId);
    await user.save();

    res.status(200).json({ status: "success", data: { wishlist: user.wishlist } });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("wishlist");
    res.status(200).json({ status: "success", data: { wishlist: user.wishlist } });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

exports.trackView = async (req, res, next) => {
  try {
    if (req.user) {
      const user = await User.findById(req.user.id);
      const roomId = req.params.id;
      
      // Keep only last 10 viewed rooms
      user.viewedRooms = user.viewedRooms.filter(id => id.toString() !== roomId);
      user.viewedRooms.unshift(roomId);
      if (user.viewedRooms.length > 10) user.viewedRooms.pop();
      
      await user.save({ validateBeforeSave: false });
    }
  } catch (error) {
    // Silently ignore view tracking errors
    console.error("View tracking error:", error.message);
  }
  next();
};
