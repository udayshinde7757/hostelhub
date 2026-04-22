// ============================================
// GLOBAL VARIABLES
// ============================================
// Our data will now be populated by the Backend API
let roomsData = [];
// API base URL (ensure your node backend is running on this port)
const API_URL = "http://localhost:3000";

// Initialize Lucide icons
lucide.createIcons();

// DOM TARGETS
const roomContainer = document.getElementById("roomContainer");
const resultCountText = document.getElementById("resultCount");
const noResultsDiv = document.getElementById("noResults");
const heroAreaSelect = document.getElementById("heroAreaSelect");
const priceFilterInput = document.getElementById("priceFilter");
const quickAreaPills = document.querySelectorAll(".pill");

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

document.getElementById("openAddRoomBtn").addEventListener("click", () => addRoomModal.classList.remove("hidden"));
document.getElementById("closeAddRoomBtn").addEventListener("click", () => addRoomModal.classList.add("hidden"));
document.getElementById("openLoginBtn").addEventListener("click", () => loginModal.classList.remove("hidden"));
document.getElementById("closeLoginBtn").addEventListener("click", () => loginModal.classList.add("hidden"));
document.getElementById("openSignupBtn").addEventListener("click", (e) => {
  e.preventDefault();
  alert("Redirecting to Signup Page... (Functionality to be added)");
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
