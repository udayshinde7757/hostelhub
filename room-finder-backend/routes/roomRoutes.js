const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomController");
const authController = require("../controllers/authController");
const bookingController = require("../controllers/bookingController");
const upload = require("../middleware/upload");

// PUBLIC ROUTES
router.get("/latest", roomController.getLatestRooms);
router.get("/trending", roomController.getTrendingRooms);
router.get("/recommended", roomController.getRecommendedRooms);
router.get("/", roomController.getAllRooms);
router.get(
  "/my",
  authController.protect,
  authController.authorizeRoles("landlord", "admin"),
  roomController.getMyRooms
);
router.get("/:id", roomController.getRoomById);
router.post("/:id/click", roomController.trackWhatsAppClick);

// PROTECTED ROUTES
router.use(authController.protect);

router.patch("/:id/status", roomController.updateRoomStatus);
router.post("/upload", upload.array("images", 5), roomController.uploadRoomImages);
router.post("/:id/book", bookingController.createBooking);

// LANDLORD ONLY ROUTES
router.use(authController.authorizeRoles("landlord", "admin"));

router.post("/", upload.array("images", 5), roomController.createRoom);
router.put("/:id", upload.array("images", 5), roomController.updateRoom);
router.delete("/:id", roomController.deleteRoom);

module.exports = router;
