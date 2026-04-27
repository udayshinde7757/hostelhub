const axios = require("axios");

// @desc    Get Google Maps API Key
// @route   GET /api/v1/maps/key
// @access  Public
exports.getMapsKey = (req, res) => {
  res.status(200).json({
    status: "success",
    data: {
      key: process.env.GOOGLE_MAPS_API_KEY || "",
    },
  });
};

// @desc    Geocode an address to get coordinates
// @route   POST /api/v1/maps/geocode
// @access  Public
exports.geocodeAddress = async (req, res, next) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide an address",
      });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
       return res.status(500).json({
           status: "fail",
           message: "Google Maps API Key is not configured."
       });
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );

    if (response.data.status !== "OK") {
      return res.status(400).json({
        status: "fail",
        message: `Geocoding failed: ${response.data.status}`,
      });
    }

    const location = response.data.results[0].geometry.location;

    res.status(200).json({
      status: "success",
      data: {
        coordinates: location, // { lat: ..., lng: ... }
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Route Data
// @route   GET /api/v1/maps/route
// @access  Public
exports.getRoute = async (req, res, next) => {
  try {
    const { originLat, originLng, destLat, destLng, mode } = req.query;
    
    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide origin and destination coordinates",
      });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const travelMode = mode || "driving";

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=${travelMode}&key=${apiKey}`
    );

    if (response.data.status !== "OK") {
      return res.status(400).json({
        status: "fail",
        message: `Directions API failed: ${response.data.status}`,
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        route: response.data.routes[0],
      },
    });
  } catch (error) {
    next(error);
  }
};
