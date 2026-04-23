const https = require('https');

// Helper to make an HTTPS request
function httpsGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "RoomSathi/1.0 (local dev)",
          ...headers,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`Request failed (${res.statusCode || "unknown"})`));
          }
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error("Invalid JSON response"));
          }
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

// GET /geocode?q=... -> Convert destination text into lat/lng
exports.getGeocode = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Query parameter 'q' is required." });

    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=" +
      encodeURIComponent(q);

    const results = await httpsGetJson(url);
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(404).json({ error: "No matching location found." });
    }

    const first = results[0];
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(500).json({ error: "Geocoding returned an invalid coordinate." });
    }

    res.json({
      lat,
      lng,
      displayName: first.display_name || q,
    });
  } catch (error) {
    next(error);
  }
};

// GET /route?fromLat&fromLng&toLat&toLng&mode -> Optimal path between two points
exports.getRoute = async (req, res, next) => {
  try {
    const fromLat = Number(req.query.fromLat);
    const fromLng = Number(req.query.fromLng);
    const toLat = Number(req.query.toLat);
    const toLng = Number(req.query.toLng);
    const modeRaw = String(req.query.mode || "driving");
    const mode = modeRaw === "walking" || modeRaw === "cycling" ? modeRaw : "driving";

    if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
      return res.status(400).json({ error: "fromLat, fromLng, toLat, toLng must be valid numbers." });
    }

    const osrmUrl =
      `https://router.project-osrm.org/route/v1/${mode}/` +
      `${encodeURIComponent(`${fromLng},${fromLat}`)};${encodeURIComponent(`${toLng},${toLat}`)}` +
      "?overview=full&geometries=geojson&steps=false";

    const data = await httpsGetJson(osrmUrl);
    const best = data?.routes?.[0];
    if (!best?.geometry?.coordinates?.length) {
      return res.status(502).json({ error: "Routing service returned no route." });
    }

    res.json({
      distanceMeters: Number(best.distance),
      durationSeconds: Number(best.duration),
      geometry: best.geometry, // GeoJSON LineString, coordinates are [lng,lat]
    });
  } catch (error) {
    next(error);
  }
};
