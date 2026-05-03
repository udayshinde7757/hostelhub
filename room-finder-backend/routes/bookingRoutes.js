const express = require("express");
const bookingController = require("../controllers/bookingController");
const { protect } = require("../controllers/authController");

const router = express.Router();

router.use(protect); // All routes below are protected

router.post("/", bookingController.createBooking);
router.get("/", bookingController.getMyBookings);

module.exports = router;
