const Booking = require("../models/Booking");
const Room = require("../models/Room");

exports.createBooking = async (req, res) => {
  try {
    const room = await Room.findById(req.body.roomId);
    if (!room) {
      return res.status(404).json({ status: "fail", message: "Room not found" });
    }

    if (room.availableRooms <= 0) {
      return res.status(400).json({ status: "fail", message: "Fully Occupied" });
    }

    // Calculate nights (simplified, assume 1 month if not provided)
    let totalPrice = room.price;
    let endDate = req.body.endDate;
    
    if (req.body.startDate && req.body.endDate) {
      const start = new Date(req.body.startDate);
      const end = new Date(req.body.endDate);
      const months = Math.max(1, (end - start) / (1000 * 60 * 60 * 24 * 30));
      totalPrice = room.price * months;
    }

    const booking = await Booking.create({
      user: req.user.id,
      room: room._id,
      startDate: req.body.startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days default
      totalPrice
    });

    // Decrement availability
    room.availableRooms -= 1;
    await room.save();

    res.status(201).json({ status: "success", data: { booking } });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).populate("room");
    res.status(200).json({ status: "success", data: { bookings } });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};
