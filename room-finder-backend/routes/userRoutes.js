const express = require("express");
const userController = require("../controllers/userController");
const { protect } = require("../controllers/authController");

const router = express.Router();

router.use(protect); // All routes below are protected

router.get("/wishlist", userController.getWishlist);
router.post("/wishlist/:roomId", userController.addToWishlist);
router.delete("/wishlist/:roomId", userController.removeFromWishlist);

module.exports = router;
