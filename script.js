let roomsData = [];

const API_URL =
  window.location.protocol === "http:" || window.location.protocol === "https:"
    ? window.location.port === "3000"
      ? window.location.origin
      : "http://localhost:3000"
    : "http://localhost:3000";
const FALLBACK_IMAGE = "https://via.placeholder.com/800x500?text=RoomSathi";

const roomContainer = document.getElementById("roomContainer");
const resultCountText = document.getElementById("resultCount");
const noResultsDiv = document.getElementById("noResults");
const heroAreaSelect = document.getElementById("heroAreaSelect");
const priceFilterInput = document.getElementById("priceFilter");
const quickAreaPills = document.querySelectorAll(".pill");
const mapSection = document.getElementById("mapSection");
const mapDiv = document.getElementById("map");
const routeMeta = document.getElementById("routeMeta");
const directionsModal = document.getElementById("directionsModal");
const openDirectionsBtn = document.getElementById("openDirectionsBtn");
const closeDirectionsBtn = document.getElementById("closeDirectionsBtn");
const openGoogleMapsBtn = document.getElementById("openGoogleMapsBtn");
const hideMapBtn = document.getElementById("hideMapBtn");
const directionsForm = document.getElementById("directionsForm");
const destinationInput = document.getElementById("destinationInput");
const travelModeSelect = document.getElementById("travelModeSelect");
const directionsError = document.getElementById("directionsError");
const addRoomBtn = document.getElementById("openAddRoomBtn");
const authEntryBtn = document.getElementById("authEntryBtn");
const dashboardBtn = document.getElementById("dashboardBtn");

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("roomsathiUser") || "null");
  } catch (error) {
    return null;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrice(value) {
  return Number(value).toLocaleString("en-IN");
}

function resolveImageSrc(value) {
  if (!value) {
    return FALLBACK_IMAGE;
  }

  if (value.startsWith("/uploads/")) {
    return `${API_URL}${value}`;
  }

  return value;
}

function getRoomImages(room) {
  if (Array.isArray(room.images) && room.images.length) {
    return room.images;
  }

  if (room.image) {
    return [room.image];
  }

  return [FALLBACK_IMAGE];
}

function updateNavForCurrentUser() {
  const user = getCurrentUser();

  if (!user || !user.role) {
    authEntryBtn.textContent = "Login";
    authEntryBtn.setAttribute("href", "login.html");
    dashboardBtn.classList.add("hidden");
    return;
  }

  authEntryBtn.textContent = "Logout";
  authEntryBtn.setAttribute("href", "#");
  dashboardBtn.classList.remove("hidden");
  dashboardBtn.textContent = user.role === "owner" ? "Owner Dashboard" : "Student Dashboard";
  dashboardBtn.setAttribute("href", user.role === "owner" ? "owner.html" : "student.html");
}

async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  throw new Error(text || "Unexpected server response.");
}

async function fetchRoomsFromBackend() {
  try {
    roomContainer.innerHTML = '<p class="status-text">Loading rooms from Nagpur...</p>';

    const response = await fetch(`${API_URL}/rooms`);
    const data = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch rooms from server.");
    }

    roomsData = Array.isArray(data) ? data : [];
    applyFilters();
  } catch (error) {
    roomContainer.innerHTML =
      `<p class="error-text">${escapeHtml(error.message || "Could not connect to the backend server.")}</p>`;
    resultCountText.textContent = "0 stays found";
  }
}

function renderRooms(rooms) {
  roomContainer.innerHTML = "";
  resultCountText.textContent = `${rooms.length} stays found`;

  if (!rooms.length) {
    noResultsDiv.classList.remove("hidden");
    return;
  }

  noResultsDiv.classList.add("hidden");

  rooms.forEach((room) => {
    const area = room.location || room.area || "Nagpur";
    const messText = room.messAvailable ? "Mess available" : "Mess not available";
    const photoCount = getRoomImages(room).length;
    const primaryImage = resolveImageSrc(getRoomImages(room)[0]);

    roomContainer.insertAdjacentHTML(
      "beforeend",
      `
        <article class="card">
          <div class="card-image-wrap">
            <img src="${escapeHtml(primaryImage)}" alt="${escapeHtml(room.name)}" loading="lazy">
            <div class="card-badge badge-top-left">
              <i data-lucide="map-pin" class="star-icon"></i> ${escapeHtml(area)}
            </div>
            <div class="card-badge badge-top-right">${photoCount}</div>
            <div class="image-content">
              <h3>${escapeHtml(room.name)}</h3>
              <p><i data-lucide="utensils-crossed" style="width:14px;height:14px;"></i> ${escapeHtml(messText)}</p>
            </div>
          </div>
          <div class="card-body">
            <div class="amenities">
              <div class="amenity-icon"><i data-lucide="images"></i></div>
              <div class="amenity-icon"><i data-lucide="phone"></i></div>
              <div class="amenity-icon"><i data-lucide="map-pinned"></i></div>
            </div>
            <div class="price-section">
              <span class="price-label">from</span>
              <div class="price-val">INR ${formatPrice(room.price)} <span class="price-unit">/month</span></div>
            </div>
          </div>
          <div class="card-footer">
            <a class="btn-primary full-width card-link-button" href="tel:${escapeHtml(room.ownerContact || "")}">
              Contact Owner
            </a>
          </div>
        </article>
      `
    );
  });

  lucide.createIcons();
}

function applyFilters() {
  const selectedArea = heroAreaSelect.value;
  const maxPrice = priceFilterInput.value ? Number(priceFilterInput.value) : Infinity;

  const filteredRooms = roomsData.filter((room) => {
    const area = room.location || room.area;
    const matchesArea = selectedArea === "all" || area === selectedArea;
    const matchesPrice = Number(room.price) <= maxPrice;
    return matchesArea && matchesPrice;
  });

  renderRooms(filteredRooms);
}

function setRouteMeta(text) {
  if (routeMeta) {
    routeMeta.textContent = text;
  }
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) {
    return "";
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) {
    return "";
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} h ${remainingMinutes} min`;
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => reject(new Error("Location permission denied. Please allow location access and try again.")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

async function geocodeDestination(query) {
  const response = await fetch(`${API_URL}/geocode?q=${encodeURIComponent(query)}`);
  const data = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(data.error || data.message || "Could not find that location.");
  }

  return data;
}

async function fetchRoute({ from, to, mode }) {
  const response = await fetch(
    `${API_URL}/route?fromLat=${encodeURIComponent(from.lat)}` +
      `&fromLng=${encodeURIComponent(from.lng)}` +
      `&toLat=${encodeURIComponent(to.lat)}` +
      `&toLng=${encodeURIComponent(to.lng)}` +
      `&mode=${encodeURIComponent(mode)}`
  );
  const data = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(data.error || data.message || "Could not calculate route.");
  }

  return data;
}

let mapInstance = null;
let routeLine = null;
let fromMarker = null;
let toMarker = null;

function ensureMap(center = { lat: 21.1458, lng: 79.0882 }) {
  if (!mapDiv || typeof L === "undefined") {
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

function drawRoute({ from, to, route, destinationLabel }) {
  mapSection.classList.remove("hidden");
  const map = ensureMap(from);
  if (!map) {
    return;
  }

  if (routeLine) {
    routeLine.remove();
  }
  if (fromMarker) {
    fromMarker.remove();
  }
  if (toMarker) {
    toMarker.remove();
  }

  const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  routeLine = L.polyline(latlngs, { color: "#5b7fff", weight: 5, opacity: 0.9 }).addTo(map);
  fromMarker = L.marker([from.lat, from.lng]).addTo(map).bindPopup("You are here");
  toMarker = L.marker([to.lat, to.lng]).addTo(map).bindPopup(destinationLabel || "Destination");
  map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

  setRouteMeta(
    `Best route to ${destinationLabel || "destination"} | ${formatDistance(route.distanceMeters)} | ${formatDuration(
      route.durationSeconds
    )}`
  );
}

function openGoogleMapsDirections(from, to, mode) {
  const travelMode = mode === "walking" ? "walking" : mode === "cycling" ? "bicycling" : "driving";
  const url =
    "https://www.google.com/maps/dir/?api=1" +
    `&origin=${encodeURIComponent(`${from.lat},${from.lng}`)}` +
    `&destination=${encodeURIComponent(`${to.lat},${to.lng}`)}` +
    `&travelmode=${encodeURIComponent(travelMode)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function showDirectionsError(message) {
  directionsError.textContent = message;
  directionsError.classList.remove("hidden");
}

function clearDirectionsError() {
  directionsError.textContent = "";
  directionsError.classList.add("hidden");
}

async function resolveAndRoute({ openInGoogleMaps }) {
  clearDirectionsError();

  const destinationQuery = destinationInput.value.trim();
  const mode = travelModeSelect.value || "driving";
  if (!destinationQuery) {
    showDirectionsError("Please enter a destination.");
    return;
  }

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
    showDirectionsError(error.message || "Something went wrong while getting directions.");
    setRouteMeta("Enter a destination to see the best route.");
  }
}

heroAreaSelect.addEventListener("change", applyFilters);
priceFilterInput.addEventListener("input", applyFilters);

quickAreaPills.forEach((pill) => {
  pill.addEventListener("click", () => {
    heroAreaSelect.value = pill.getAttribute("data-area");
    applyFilters();
  });
});

addRoomBtn.addEventListener("click", (event) => {
  event.preventDefault();
  const user = getCurrentUser();

  if (!user || user.role !== "owner") {
    window.location.href = "login.html";
    return;
  }

  window.location.href = "owner.html";
});

authEntryBtn.addEventListener("click", (event) => {
  const user = getCurrentUser();

  if (!user || !user.role) {
    return;
  }

  event.preventDefault();
  localStorage.removeItem("roomsathiUser");
  updateNavForCurrentUser();
});

dashboardBtn.addEventListener("click", () => {
  const user = getCurrentUser();
  if (!user || !user.role) {
    dashboardBtn.setAttribute("href", "login.html");
  }
});

openDirectionsBtn.addEventListener("click", (event) => {
  event.preventDefault();
  directionsModal.classList.remove("hidden");
});

closeDirectionsBtn.addEventListener("click", () => {
  directionsModal.classList.add("hidden");
});

directionsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  resolveAndRoute({ openInGoogleMaps: false });
});

openGoogleMapsBtn.addEventListener("click", () => {
  resolveAndRoute({ openInGoogleMaps: true });
});

hideMapBtn.addEventListener("click", () => {
  mapSection.classList.add("hidden");
});

lucide.createIcons();
updateNavForCurrentUser();
fetchRoomsFromBackend();
