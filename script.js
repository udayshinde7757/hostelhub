// ============================================
// GLOBAL VARIABLES
// ============================================
// Our data will now be populated by the Backend API
let roomsData = [];
// API base URL (ensure your node backend is running on this port)
const API_URL =
  window.location.protocol === "http:" || window.location.protocol === "https:"
    ? window.location.origin
    : "http://localhost:3000";

// Initialize Lucide icons
lucide.createIcons();

// DOM TARGETS
const roomContainer = document.getElementById("roomContainer");
const resultCountText = document.getElementById("resultCount");
const noResultsDiv = document.getElementById("noResults");
const heroAreaSelect = document.getElementById("heroAreaSelect");
const priceFilterInput = document.getElementById("priceFilter");
const quickAreaPills = document.querySelectorAll(".pill");
const mapSection = document.getElementById("mapSection");
const mapDiv = document.getElementById("map");
const routeMeta = document.getElementById("routeMeta");

// ============================================
// API: FETCH ROOMS FROM BACKEND
// ============================================
async function fetchRoomsFromBackend() {
  try {
    // Show loading state
    roomContainer.innerHTML = "<p>Loading rooms from Nagpur...</p>";
    
    const response = await fetch(`${API_URL}/rooms`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch rooms from server.");
    }
    
    // Parse JSON
    roomsData = await response.json();
    
    // Once data is fetched, apply any existing filters safely
    applyFilters();
  } catch (error) {
    console.error("API Error:", error);
    roomContainer.innerHTML = `<p class="error-text">⚠️ Could not connect to backend server. Make sure it is running!</p>`;
  }
}

// ============================================
// RENDER FUNCTION (Displaying HTML)
// ============================================
function renderRooms(rooms) {
  roomContainer.innerHTML = "";
  resultCountText.innerText = `${rooms.length} stays found`;

  if (rooms.length === 0) {
    noResultsDiv.classList.remove("hidden");
  } else {
    noResultsDiv.classList.add("hidden");
  }

  rooms.forEach(room => {
    const cardHTML = `
      <div class="card">
        <div class="card-image-wrap">
          <img src="${room.image}" alt="${room.name}" loading="lazy">
          <div class="card-badge badge-top-left">
            <i data-lucide="star" class="star-icon"></i> ${room.rating} (${room.reviews})
          </div>
          <div class="card-badge badge-top-right"><i data-lucide="heart"></i></div>
          <div class="image-content">
            <h3>${room.name}</h3>
            <p><i data-lucide="map-pin" style="width:14px;height:14px;"></i> ${room.area}, Nagpur</p>
          </div>
        </div>
        <div class="card-body">
          <div class="amenities">
            <div class="amenity-icon"><i data-lucide="wifi"></i></div>
            <div class="amenity-icon"><i data-lucide="coffee"></i></div>
            <div class="amenity-icon"><i data-lucide="wind"></i></div>
          </div>
          <div class="price-section">
            <span class="price-label">from</span>
            <div class="price-val">₹${room.price} <span class="price-unit">/month</span></div>
          </div>
        </div>
        <div class="card-footer">
          <button class="btn-primary full-width">View Details</button>
        </div>
      </div>
    `;
    roomContainer.insertAdjacentHTML("beforeend", cardHTML);
  });

  lucide.createIcons();
}

// ============================================
// FILTERING LOGIC
// ============================================
function applyFilters() {
  const selectedArea = heroAreaSelect.value;
  const maxPrice = priceFilterInput.value ? Number(priceFilterInput.value) : Infinity;

  const filteredRooms = roomsData.filter(room => {
    const matchesArea = selectedArea === "all" || room.area === selectedArea;
    const matchesPrice = room.price <= maxPrice;
    return matchesArea && matchesPrice;
  });

  renderRooms(filteredRooms);
}

// Event listeners for filters
heroAreaSelect.addEventListener("change", applyFilters);
priceFilterInput.addEventListener("input", applyFilters);
quickAreaPills.forEach(pill => {
  pill.addEventListener("click", () => {
    heroAreaSelect.value = pill.getAttribute("data-area");
    applyFilters();
  });
});

// ============================================
// MODAL (POPUP) UI LOGIC
// ============================================
const addRoomModal = document.getElementById("addRoomModal");
const loginModal = document.getElementById("loginModal");
const directionsModal = document.getElementById("directionsModal");

document.getElementById("openAddRoomBtn").addEventListener("click", () => addRoomModal.classList.remove("hidden"));
document.getElementById("closeAddRoomBtn").addEventListener("click", () => addRoomModal.classList.add("hidden"));
document.getElementById("openLoginBtn").addEventListener("click", () => loginModal.classList.remove("hidden"));
document.getElementById("closeLoginBtn").addEventListener("click", () => loginModal.classList.add("hidden"));
document.getElementById("openDirectionsBtn").addEventListener("click", () => directionsModal.classList.remove("hidden"));
document.getElementById("closeDirectionsBtn").addEventListener("click", () => directionsModal.classList.add("hidden"));
document.getElementById("openSignupBtn").addEventListener("click", (e) => {
  e.preventDefault();
  alert("Redirecting to Signup Page... (Functionality to be added)");
});

// ============================================
// MAP + DIRECTIONS (Leaflet + Google Maps)
// ============================================
let mapInstance = null;
let routeLine = null;
let fromMarker = null;
let toMarker = null;

function ensureMap(center = { lat: 21.1458, lng: 79.0882 }) {
  if (!mapDiv) return null;
  if (typeof L === "undefined") {
    showDirectionsError("Map library failed to load (Leaflet). Please refresh and try again.");
    return null;
  }

  if (!mapInstance) {
    mapInstance = L.map(mapDiv).setView([center.lat, center.lng], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapInstance);
  } else {
    mapInstance.setView([center.lat, center.lng], 12);
  }

  // If map was created while hidden, make sure it lays out correctly once shown.
  setTimeout(() => mapInstance && mapInstance.invalidateSize(), 50);
  return mapInstance;
}

function setRouteMeta(text) {
  if (!routeMeta) return;
  routeMeta.innerText = text;
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} h ${m} min`;
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation is not supported in this browser."));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("Location permission denied. Please allow location access and try again.")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

async function geocodeDestination(query) {
  const url = `${API_URL}/geocode?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not find that location.");
  return data; // { lat, lng, displayName }
}

async function fetchRoute({ from, to, mode }) {
  const url =
    `${API_URL}/route?fromLat=${encodeURIComponent(from.lat)}` +
    `&fromLng=${encodeURIComponent(from.lng)}` +
    `&toLat=${encodeURIComponent(to.lat)}` +
    `&toLng=${encodeURIComponent(to.lng)}` +
    `&mode=${encodeURIComponent(mode)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not calculate route.");
  return data; // { distanceMeters, durationSeconds, geometry }
}

function drawRoute({ from, to, route, destinationLabel }) {
  mapSection.classList.remove("hidden");
  const m = ensureMap(from);
  if (!m) return;

  if (routeLine) routeLine.remove();
  if (fromMarker) fromMarker.remove();
  if (toMarker) toMarker.remove();

  const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  routeLine = L.polyline(latlngs, { color: "#5b7fff", weight: 5, opacity: 0.9 }).addTo(m);
  fromMarker = L.marker([from.lat, from.lng]).addTo(m).bindPopup("You are here");
  toMarker = L.marker([to.lat, to.lng]).addTo(m).bindPopup(destinationLabel || "Destination");

  m.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

  const distance = formatDistance(route.distanceMeters);
  const duration = formatDuration(route.durationSeconds);
  setRouteMeta(`Best route to ${destinationLabel || "destination"} • ${distance} • ${duration}`);
}

function openGoogleMapsDirections(from, to, mode) {
  // Google Maps chooses an optimal route; no API key needed for this link.
  const travelMode =
    mode === "walking" ? "walking" : mode === "cycling" ? "bicycling" : "driving";
  const url =
    "https://www.google.com/maps/dir/?api=1" +
    `&origin=${encodeURIComponent(`${from.lat},${from.lng}`)}` +
    `&destination=${encodeURIComponent(`${to.lat},${to.lng}`)}` +
    `&travelmode=${encodeURIComponent(travelMode)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

const directionsForm = document.getElementById("directionsForm");
const destinationInput = document.getElementById("destinationInput");
const travelModeSelect = document.getElementById("travelModeSelect");
const directionsError = document.getElementById("directionsError");

function showDirectionsError(msg) {
  if (!directionsError) return;
  directionsError.innerText = msg;
  directionsError.classList.remove("hidden");
}

function clearDirectionsError() {
  if (!directionsError) return;
  directionsError.innerText = "";
  directionsError.classList.add("hidden");
}

async function resolveAndRoute({ openInGoogleMaps }) {
  clearDirectionsError();
  const destinationQuery = (destinationInput?.value || "").trim();
  const mode = travelModeSelect?.value || "driving";
  if (!destinationQuery) return showDirectionsError("Please enter a destination.");

  try {
    setRouteMeta("Getting your location...");
    const from = await getCurrentPosition();

    setRouteMeta("Finding destination...");
    const dest = await geocodeDestination(destinationQuery);
    const to = { lat: dest.lat, lng: dest.lng };

    if (openInGoogleMaps) {
      openGoogleMapsDirections(from, to, mode);
      directionsModal.classList.add("hidden");
      return;
    }

    setRouteMeta("Calculating best route...");
    const route = await fetchRoute({ from, to, mode });

    directionsModal.classList.add("hidden");
    drawRoute({ from, to, route, destinationLabel: dest.displayName || destinationQuery });
  } catch (err) {
    const message = err?.message || "Something went wrong while getting directions.";
    showDirectionsError(message);
    setRouteMeta("Enter a destination to see the best route.");
  }
}

if (directionsForm) {
  directionsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    resolveAndRoute({ openInGoogleMaps: false });
  });
}

document.getElementById("openGoogleMapsBtn")?.addEventListener("click", () => {
  resolveAndRoute({ openInGoogleMaps: true });
});

document.getElementById("hideMapBtn")?.addEventListener("click", () => {
  mapSection.classList.add("hidden");
});

// ============================================
// API: POST - ADD ROOM VALIDATION & LOGIC
// ============================================
const addRoomForm = document.getElementById("addRoomForm");
const formErrorText = document.getElementById("formError");

addRoomForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("roomNameInput").value.trim();
  const price = document.getElementById("roomPriceInput").value.trim();
  const area = document.getElementById("roomAreaInput").value;
  const image = document.getElementById("roomImageInput").value.trim();

  // Frontend Validation
  if (!name || !price || !area) {
    formErrorText.innerText = "Please fill in all required fields.";
    formErrorText.classList.remove("hidden");
    return;
  }
  if (isNaN(price) || Number(price) <= 0) {
    formErrorText.innerText = "Please enter a valid positive price.";
    formErrorText.classList.remove("hidden");
    return;
  }

  formErrorText.classList.add("hidden");

  // Send Data to Backend
  try {
    const response = await fetch(`${API_URL}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price, area, image })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to add room to server.");
    }

    alert(data.message);
    
    // Close Modal and clear form
    addRoomModal.classList.add("hidden");
    addRoomForm.reset();

    // Re-fetch rooms from server to ensure data is perfectly in sync
    fetchRoomsFromBackend();

  } catch (error) {
    console.error("Submit Error:", error);
    formErrorText.innerText = "Error: " + error.message;
    formErrorText.classList.remove("hidden");
  }
});

// ============================================
// API: POST - LOGIN LOGIC
// ============================================
const loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  // Quick hack: because our HTML button says "Login" but it's type="button", we need to change it to type="submit" in HTML. 
  // Let's assume the user typed an email and password
  const inputs = loginForm.querySelectorAll("input");
  const email = inputs[0].value;
  const password = inputs[1].value;

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    alert(data.message);
    loginModal.classList.add("hidden");
    loginForm.reset();
  } catch (error) {
    alert("Error logging in: " + error.message);
  }
});

// Boot up the application by fetching Data!
fetchRoomsFromBackend();
