// ============================================
// GLOBAL VARIABLES
// ============================================
let roomsData = [];

const API_URL = "http://localhost:3001";

lucide.createIcons();

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
    roomContainer.innerHTML = "<p>Loading rooms from Nagpur...</p>";

    const response = await fetch(`${API_URL}/rooms`);

    if (!response.ok) {
      throw new Error("Failed to fetch rooms from server.");
    }

    const data = await response.json();
    roomsData = data.rooms ? data.rooms : data;
    applyFilters();
  } catch (error) {
    console.error("API Error:", error);
    roomContainer.innerHTML =
      '<p class="error-text">Could not connect to the backend server. Make sure it is running.</p>';
  }
}

// ============================================
// RENDER FUNCTION
// ============================================
function renderRooms(rooms) {
  roomContainer.innerHTML = "";
  resultCountText.innerText = `${rooms.length} stays found`;

  if (rooms.length === 0) {
    noResultsDiv.classList.remove("hidden");
  } else {
    noResultsDiv.classList.add("hidden");
  }

  rooms.forEach((room) => {
    const area = room.area || room.location || "Nagpur";
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
            <p><i data-lucide="map-pin" style="width:14px;height:14px;"></i> ${area}, Nagpur</p>
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
            <div class="price-val">INR ${room.price} <span class="price-unit">/month</span></div>
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

  const filteredRooms = roomsData.filter((room) => {
    const area = room.area || room.location;
    const matchesArea = selectedArea === "all" || area === selectedArea;
    const matchesPrice = room.price <= maxPrice;
    return matchesArea && matchesPrice;
  });

  renderRooms(filteredRooms);
}

heroAreaSelect.addEventListener("change", applyFilters);
priceFilterInput.addEventListener("input", applyFilters);
quickAreaPills.forEach((pill) => {
  pill.addEventListener("click", () => {
    heroAreaSelect.value = pill.getAttribute("data-area");
    applyFilters();
  });
});

// ============================================
// MODAL UI LOGIC
// ============================================
const addRoomModal = document.getElementById("addRoomModal");
const loginModal = document.getElementById("loginModal");
const signupModal = document.getElementById("signupModal");
const directionsModal = document.getElementById("directionsModal");

document.getElementById("openAddRoomBtn").addEventListener("click", () => addRoomModal.classList.remove("hidden"));
document.getElementById("closeAddRoomBtn").addEventListener("click", () => addRoomModal.classList.add("hidden"));
document.getElementById("openLoginBtn").addEventListener("click", () => loginModal.classList.remove("hidden"));
document.getElementById("closeLoginBtn").addEventListener("click", () => loginModal.classList.add("hidden"));
document.getElementById("closeSignupBtn").addEventListener("click", () => signupModal.classList.add("hidden"));
document.getElementById("openDirectionsBtn").addEventListener("click", () => directionsModal.classList.remove("hidden"));
document.getElementById("closeDirectionsBtn").addEventListener("click", () => directionsModal.classList.add("hidden"));

document.getElementById("openSignupBtn").addEventListener("click", (event) => {
  event.preventDefault();
  loginModal.classList.add("hidden");
  signupModal.classList.remove("hidden");
});

document.getElementById("backToLoginBtn").addEventListener("click", (event) => {
  event.preventDefault();
  signupModal.classList.add("hidden");
  loginModal.classList.remove("hidden");
});

// ============================================
// MAP + DIRECTIONS
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
  const hours = Math.floor(mins / 60);
  const remainingMinutes = mins % 60;
  return `${hours} h ${remainingMinutes} min`;
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Geolocation is not supported in this browser."));
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => reject(new Error("Location permission denied. Please allow location access and try again.")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

async function geocodeDestination(query) {
  const url = `${API_URL}/geocode?q=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || "Could not find that location.");
  return data;
}

async function fetchRoute({ from, to, mode }) {
  const url =
    `${API_URL}/route?fromLat=${encodeURIComponent(from.lat)}` +
    `&fromLng=${encodeURIComponent(from.lng)}` +
    `&toLat=${encodeURIComponent(to.lat)}` +
    `&toLng=${encodeURIComponent(to.lng)}` +
    `&mode=${encodeURIComponent(mode)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || "Could not calculate route.");
  return data;
}

function drawRoute({ from, to, route, destinationLabel }) {
  mapSection.classList.remove("hidden");
  const map = ensureMap(from);
  if (!map) return;

  if (routeLine) routeLine.remove();
  if (fromMarker) fromMarker.remove();
  if (toMarker) toMarker.remove();

  const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  routeLine = L.polyline(latlngs, { color: "#5b7fff", weight: 5, opacity: 0.9 }).addTo(map);
  fromMarker = L.marker([from.lat, from.lng]).addTo(map).bindPopup("You are here");
  toMarker = L.marker([to.lat, to.lng]).addTo(map).bindPopup(destinationLabel || "Destination");

  map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

  const distance = formatDistance(route.distanceMeters);
  const duration = formatDuration(route.durationSeconds);
  setRouteMeta(`Best route to ${destinationLabel || "destination"} | ${distance} | ${duration}`);
}

function openGoogleMapsDirections(from, to, mode) {
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

function showDirectionsError(message) {
  if (!directionsError) return;
  directionsError.innerText = message;
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
    const destination = await geocodeDestination(destinationQuery);
    const to = { lat: destination.lat, lng: destination.lng };

    if (openInGoogleMaps) {
      openGoogleMapsDirections(from, to, mode);
      directionsModal.classList.add("hidden");
      return;
    }

    setRouteMeta("Calculating best route...");
    const route = await fetchRoute({ from, to, mode });

    directionsModal.classList.add("hidden");
    drawRoute({ from, to, route, destinationLabel: destination.displayName || destinationQuery });
  } catch (error) {
    const message = error?.message || "Something went wrong while getting directions.";
    showDirectionsError(message);
    setRouteMeta("Enter a destination to see the best route.");
  }
}

if (directionsForm) {
  directionsForm.addEventListener("submit", (event) => {
    event.preventDefault();
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
// ADD ROOM
// ============================================
const addRoomForm = document.getElementById("addRoomForm");
const formErrorText = document.getElementById("formError");

addRoomForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("roomNameInput").value.trim();
  const price = document.getElementById("roomPriceInput").value.trim();
  const area = document.getElementById("roomAreaInput").value;
  const ownerContact = document.getElementById("roomOwnerContactInput").value.trim();
  const messAvailable = document.getElementById("roomMessAvailableInput").checked;
  const image = document.getElementById("roomImageInput").value.trim();

  if (!name || !price || !area || !ownerContact) {
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

  try {
    const response = await fetch(`${API_URL}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price: Number(price), location: area, ownerContact, messAvailable, image }), // Use location explicitly
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || "Failed to add room to server.");
    }

    alert(data.message);
    addRoomModal.classList.add("hidden");
    addRoomForm.reset();
    fetchRoomsFromBackend();
  } catch (error) {
    console.error("Submit Error:", error);
    formErrorText.innerText = "Error: " + error.message;
    formErrorText.classList.remove("hidden");
  }
});

// ============================================
// LOGIN
// ============================================
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    loginError.classList.add("hidden");
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || "Login failed.");
    }

    alert(data.message);
    loginModal.classList.add("hidden");
    loginForm.reset();
  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.remove("hidden");
  }
});

// ============================================
// SIGNUP
// ============================================
const signupForm = document.getElementById("signupForm");
const signupError = document.getElementById("signupError");

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  // Basic validate password length
  if (password.length < 6) {
    signupError.textContent = "Password must be at least 6 characters long.";
    signupError.classList.remove("hidden");
    return;
  }

  try {
    signupError.classList.add("hidden");
    const response = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || "Signup failed.");
    }

    alert(data.message);
    signupModal.classList.add("hidden");
    signupForm.reset();
    
    // Open login modal after successful signup
    loginModal.classList.remove("hidden");
  } catch (error) {
    signupError.textContent = error.message;
    signupError.classList.remove("hidden");
  }
});

fetchRoomsFromBackend();
