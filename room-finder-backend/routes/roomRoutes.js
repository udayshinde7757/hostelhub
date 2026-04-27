const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomController");
const authController = require("../controllers/authController");
const upload = require("../middleware/upload");

// PUBLIC ROUTES
router.get("/", roomController.getAllRooms);
router.get("/recommended", roomController.getRecommendedRooms);
router.get("/:id", roomController.getRoomById);

// PROTECTED ROUTES (Admin or Logged in user)
router.use(authController.protect);

router.post("/upload", upload.array("images", 5), roomController.uploadRoomImages);
router.post("/:id/book", roomController.bookRoom);

router.post("/", roomController.createRoom);
router.put("/:id", roomController.updateRoom);
router.delete("/:id", roomController.deleteRoom);

module.exports = router;
