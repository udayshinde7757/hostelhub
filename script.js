<<<<<<< HEAD
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
=======
// ============================================
// CONFIGURATION & GLOBAL STATE
// ============================================
const CONFIG = {
  // Replace this URL with your deployed backend URL (e.g. Render/Railway)
  PRODUCTION_API_URL: 'https://roomsathi-api.onrender.com/api/v1',
  
  get API_URL() {
    return (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname)
      ? 'http://localhost:3001/api/v1'
      : this.PRODUCTION_API_URL;
  },
  DEFAULT_CENTER: { lat: 21.1458, lng: 79.0882 }
};

let state = {
  allRooms: [],
  recommendedRooms: [],
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user')) || null,
  currentLocation: null
};

let map;
let directionsService;
let directionsRenderer;

// ============================================
// HELPERS
// ============================================
const debounce = (fn, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function renderSkeletons(containerId, count = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Array(count).fill(`
    <div class="card skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-text" style="width: 70%"></div>
      <div class="skeleton skeleton-text" style="width: 40%"></div>
    </div>
  `).join('');
}

// ============================================
// API CALLS
// ============================================
const api = {
  async request(endpoint, method = 'GET', body = null, params = {}) {
    const url = new URL(`${CONFIG.API_URL}${endpoint}`, window.location.origin);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    const options = {
      method,
      headers: {
        'Authorization': state.token ? `Bearer ${state.token}` : ''
      }
    };

    if (body) {
      if (body instanceof FormData) {
        options.body = body;
        // Let the browser set the Content-Type with boundary for FormData
      } else {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
    }

    try {
      const response = await fetch(url, options);
      
      // Handle non-JSON responses (like empty bodies or HTML error pages)
      const contentType = response.headers.get('content-type');
      let data = {};
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If not JSON, get text and check if it's empty
        const text = await response.text();
        if (text) data = { message: text };
      }

      if (!response.ok) {
        throw new Error(data.message || `Server Error: ${response.status}`);
      }

      return data;
    } catch (err) {
      if (err.name === 'SyntaxError') {
        throw new Error('Invalid response from server. Please try again.');
      }
      throw err;
    }
  },

  get(endpoint, params) { return this.request(endpoint, 'GET', null, params); },
  post(endpoint, body) { return this.request(endpoint, 'POST', body); }
};


// ============================================
// RENDER FUNCTIONS
// ============================================
function getAmenityIcon(name) {
  const icons = {
    'Wifi': 'wifi',
    'Water': 'droplets',
    'Parking': 'car',
    'AC': 'wind',
    'Mess': 'utensils'
  };
  return icons[name] || 'check-circle';
}

function renderRooms(rooms, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (!rooms || rooms.length === 0) {
    container.innerHTML = '<div class="no-results"><h3>No rooms found</h3><p>Try adjusting your filters.</p></div>';
    return;
  }

  rooms.forEach(room => {
    const card = document.createElement('div');
    card.className = 'card';
    
    // Fallback to old image if images array is empty
    const roomImages = room.images && room.images.length > 0 ? room.images : (room.image ? [room.image] : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"]);
    const isOccupied = room.availableRooms !== undefined && room.availableRooms <= 0;
    const imagesJson = encodeURIComponent(JSON.stringify(roomImages));

    card.innerHTML = `
      <div class="card-image-wrap" id="slider-${room.id}">
        <img src="${roomImages[0].startsWith('http') ? roomImages[0] : CONFIG.API_URL.replace('/api/v1', '') + roomImages[0]}" alt="${room.name}" loading="lazy" id="img-${room.id}" data-index="0">
        ${roomImages.length > 1 ? `
          <button class="slider-btn prev" onclick="changeImg('${room.id}', -1, '${imagesJson}')" type="button"><i data-lucide="chevron-left"></i></button>
          <button class="slider-btn next" onclick="changeImg('${room.id}', 1, '${imagesJson}')" type="button"><i data-lucide="chevron-right"></i></button>
        ` : ''}
        <div class="card-badge badge-top-left">
          <i data-lucide="star" class="star-icon"></i> ${Number(room.rating || 0).toFixed(1)} (${room.reviewsCount || 0})
        </div>
        ${isOccupied ? `<div class="card-badge badge-top-right occupied-badge">Fully Occupied</div>` : `<div class="card-badge badge-top-right available-badge">${room.availableRooms} Left</div>`}
        <div class="image-content">
          <h3>${room.name}</h3>
          <p><i data-lucide="map-pin" style="width:14px;height:14px;"></i> ${room.location}, Nagpur</p>
        </div>
      </div>
      <div class="card-body">
        <div class="amenities">
          ${(room.amenities || ["Wifi", "Water"]).slice(0, 3).map(a => `
            <div class="amenity-icon" title="${a}"><i data-lucide="${getAmenityIcon(a)}"></i></div>
          `).join('')}
        </div>
        <div class="price-section">
          <span class="price-label">from</span>
          <div class="price-val">INR ${room.price} <span class="price-unit">/mo</span></div>
        </div>
      </div>
      <div class="card-footer" style="display: flex; gap: 8px;">
        <button class="btn-primary full-width" ${isOccupied ? 'disabled' : ''} onclick="bookRoom('${room.id}', '${room.ownerContact}', '${room.name}')">Book / Contact</button>
        <button class="btn-secondary full-width" onclick="showDirections('${room.id}')"><i data-lucide="navigation" style="width: 16px; height: 16px; margin-right: 4px;"></i>Map</button>
      </div>
    `;
    container.appendChild(card);
>>>>>>> 557d68b498b810b538a8ccf4e9c5227fb6f8ea4e
  });
  lucide.createIcons();
}

<<<<<<< HEAD
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
=======
window.changeImg = function(roomId, direction, imagesJson) {
  event.stopPropagation();
  const imgEl = document.getElementById('img-' + roomId);
  const images = JSON.parse(decodeURIComponent(imagesJson));
  let idx = parseInt(imgEl.getAttribute('data-index'), 10);
  idx += direction;
  if (idx < 0) idx = images.length - 1;
  if (idx >= images.length) idx = 0;
  imgEl.setAttribute('data-index', idx);
  imgEl.src = images[idx].startsWith('http') ? images[idx] : CONFIG.API_URL.replace('/api/v1', '') + images[idx];
};

window.bookRoom = async function(roomId, ownerContact, roomName) {
  if (!state.token) {
    showToast("Please login to book a room.", "error");
    document.getElementById('loginModal').classList.remove('hidden');
    return;
>>>>>>> 557d68b498b810b538a8ccf4e9c5227fb6f8ea4e
  }
  
  try {
    const res = await api.post('/rooms/' + roomId + '/book', {});
    showToast("Booking request successful!");
    
    // Reload rooms to update availability
    loadAllRooms();
    loadRecommended();
    
    // Open WhatsApp
    const message = encodeURIComponent(`Hello, I am interested in your room "${roomName}" listed on RoomSathi. I would like to visit. Please let me know your available time.`);
    window.open(`https://wa.me/${ownerContact}?text=${message}`, '_blank');
  } catch (error) {
    showToast(error.message || "Could not book room", "error");
  }
};

// ============================================
// CORE ACTIONS
// ============================================
async function initApp() {
  lucide.createIcons();
  updateAuthUI();
  await getUserLocation();
  await loadGoogleMapsScript();
  loadRecommended();
  loadAllRooms();
}

<<<<<<< HEAD
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
=======
async function loadGoogleMapsScript() {
  try {
    const res = await api.get('/maps/key');
    const apiKey = res.data?.key;
    if (!apiKey) {
      console.warn("No Google Maps API key provided by backend.");
      return;
    }
    
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer();
        resolve();
      };
      script.onerror = () => reject(new Error("Failed to load Google Maps script."));
      document.head.appendChild(script);
    });
  } catch (error) {
    console.error("Error loading Maps API Key", error);
  }
}

window.showDirections = function(roomId) {
  if (!window.google || !window.google.maps) {
    showToast("Google Maps is not initialized.", "error");
    return;
  }
  
  const room = state.allRooms.find(r => r.id === roomId) || state.recommendedRooms.find(r => r.id === roomId);
  if (!room) return;
  
  if (!room.coordinates || !room.coordinates.lat) {
    showToast("This room does not have coordinates set.", "error");
    return;
  }

  if (!state.currentLocation) {
    showToast("Cannot get your current location.", "error");
    return;
  }

  const mapSection = document.getElementById('mapSection');
  if (mapSection) {
    mapSection.classList.remove('hidden');
    mapSection.scrollIntoView({ behavior: 'smooth' });
  }
  
  if (!map) {
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 12,
      center: state.currentLocation
    });
    directionsRenderer.setMap(map);
  }

  const origin = new google.maps.LatLng(state.currentLocation.lat, state.currentLocation.lng);
  const destination = new google.maps.LatLng(room.coordinates.lat, room.coordinates.lng);

  const request = {
    origin: origin,
    destination: destination,
    travelMode: google.maps.TravelMode.DRIVING,
    optimizeWaypoints: true
  };

  document.getElementById('routeMeta').innerHTML = 'Calculating route...';

  directionsService.route(request, (response, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
      directionsRenderer.setDirections(response);
      const route = response.routes[0].legs[0];
      document.getElementById('routeMeta').innerHTML = `Distance: <b>${route.distance.text}</b> | ETA: <b>${route.duration.text}</b>`;
    } else {
      showToast("Could not calculate directions.", "error");
      document.getElementById('routeMeta').innerHTML = 'Error calculating route.';
    }
  });
};

async function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      state.currentLocation = CONFIG.DEFAULT_CENTER;
      return resolve();
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.currentLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolve();
      },
      () => {
        state.currentLocation = CONFIG.DEFAULT_CENTER;
        resolve();
      },
      { timeout: 5000 }
    );
  });
}

async function loadRecommended() {
  try {
    renderSkeletons('recommendedContainer', 3);
    const res = await api.get('/rooms/recommended', { 
      lat: state.currentLocation?.lat, 
      lng: state.currentLocation?.lng 
    });
    state.recommendedRooms = res.data.rooms;
    renderRooms(state.recommendedRooms, 'recommendedContainer');
  } catch (err) {
    console.error('Recommended Rooms Error:', err);
    document.getElementById('recommendedSection').style.display = 'none';
  }
}

async function loadAllRooms(filters = {}) {
  try {
    renderSkeletons('roomContainer', 6);
    const res = await api.get('/rooms', filters);
    state.allRooms = res.data.rooms;
    renderRooms(state.allRooms, 'roomContainer');
    document.getElementById('resultCount').innerText = `${res.total || state.allRooms.length} stays in Nagpur`;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================
// AUTH HANDLERS
// ============================================
function updateAuthUI() {
  const loginBtn = document.getElementById('openLoginBtn');
  if (state.token) {
    loginBtn.innerHTML = '<i data-lucide="log-out" style="width:16px;height:16px"></i> Logout';
    loginBtn.onclick = (e) => { e.preventDefault(); logout(); };
  } else {
    loginBtn.innerHTML = 'Login';
    loginBtn.onclick = (e) => { e.preventDefault(); document.getElementById('loginModal').classList.remove('hidden'); };
  }
  lucide.createIcons();
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await api.post('/auth/login', { email, password });
    state.token = res.token;
    state.user = res.data.user;
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    
    showToast('Welcome back!');
    document.getElementById('loginModal').classList.add('hidden');
    updateAuthUI();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;

  try {
    const res = await api.post('/auth/signup', { email, password });
    state.token = res.token;
    state.user = res.data.user;
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    
    showToast('Account created successfully!');
    document.getElementById('signupModal').classList.add('hidden');
    updateAuthUI();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showToast('Logged out');
  updateAuthUI();
}

// ============================================
// ROOM ACTIONS
// ============================================
async function handleAddRoom(e) {
  e.preventDefault();
  if (!state.token) return showToast('Please login to add a room', 'error');

  const fileInput = document.getElementById('roomImagesInput');
  let uploadedImages = [];
  
  if (fileInput.files.length > 0) {
    if (fileInput.files.length > 5) {
      return showToast('Maximum 5 images allowed', 'error');
    }
    const formData = new FormData();
    for (let i = 0; i < fileInput.files.length; i++) {
      formData.append('images', fileInput.files[i]);
    }
    try {
      const uploadRes = await api.post('/rooms/upload', formData);
      uploadedImages = uploadRes.data.images;
    } catch (err) {
      return showToast('Failed to upload images: ' + err.message, 'error');
    }
  }

  const roomData = {
    name: document.getElementById('roomNameInput').value,
    price: Number(document.getElementById('roomPriceInput').value),
    location: document.getElementById('roomAreaInput').value,
    address: document.getElementById('roomAddressInput').value,
    ownerContact: document.getElementById('roomOwnerContactInput').value,
    roomCount: Number(document.getElementById('roomCountInput').value),
    availableRooms: Number(document.getElementById('availableRoomsInput').value),
    messAvailable: document.getElementById('roomMessAvailableInput').checked,
    images: uploadedImages
  };

  try {
    await api.post('/rooms', roomData);
    showToast('Room added successfully!');
    document.getElementById('addRoomModal').classList.add('hidden');
    document.getElementById('addRoomForm').reset();
    loadAllRooms();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================
// EVENT LISTENERS INITIALIZATION
// ============================================
document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
document.getElementById('signupForm')?.addEventListener('submit', handleSignup);
document.getElementById('addRoomForm')?.addEventListener('submit', handleAddRoom);

document.getElementById('heroAreaSelect')?.addEventListener('change', (e) => {
  loadAllRooms({ location: e.target.value === 'all' ? '' : e.target.value });
});

document.getElementById('priceFilter')?.addEventListener('input', debounce((e) => {
  loadAllRooms({ maxPrice: e.target.value });
}, 400));

// Navigation / UI
document.getElementById('openAddRoomBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (!state.token) return showToast('Please login first', 'error');
  document.getElementById('addRoomModal').classList.remove('hidden');
});

document.getElementById('openSignupBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('loginModal').classList.add('hidden');
  document.getElementById('signupModal').classList.remove('hidden');
});

document.getElementById('backToLoginBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('signupModal').classList.add('hidden');
  document.getElementById('loginModal').classList.remove('hidden');
});

document.querySelectorAll('.close-btn').forEach(btn => {
  btn.onclick = () => btn.closest('.modal').classList.add('hidden');
});

document.getElementById('hideMapBtn')?.addEventListener('click', () => {
  document.getElementById('mapSection').classList.add('hidden');
});

// Start the app
initApp();
>>>>>>> 557d68b498b810b538a8ccf4e9c5227fb6f8ea4e
