const express = require("express");
const mapsController = require("../controllers/mapsController");

const router = express.Router();

router.get("/key", mapsController.getMapsKey);
router.post("/geocode", mapsController.geocodeAddress);
router.get("/route", mapsController.getRoute);

module.exports = router;
