// ============================================
// 1. DUMMY DATA (Array of Objects)
// ============================================
// Here we store details of different rooms available in Nagpur.
let roomsData = [
  {
    id: 1,
    name: "Sunset Sky Hostel",
    price: 4500,
    area: "Dharampeth",
    rating: 4.8,
    reviews: 1284,
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"
  },
  {
    id: 2,
    name: "Tile House Boys PG",
    price: 3200,
    area: "Manish Nagar",
    rating: 4.7,
    reviews: 932,
    image: "https://images.unsplash.com/photo-1502672260266-1c1de2424b9e?w=800&q=80"
  },
  {
    id: 3,
    name: "Urban Living Space",
    price: 5500,
    area: "Sitabuldi",
    rating: 4.6,
    reviews: 2104,
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80"
  },
  {
    id: 4,
    name: "Cozy Corner Rooms",
    price: 2800,
    area: "Sadar",
    rating: 4.9,
    reviews: 1567,
    image: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80"
  },
  {
    id: 5,
    name: "Tech Park Residence",
    price: 6000,
    area: "IT Park",
    rating: 4.5,
    reviews: 840,
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80"
  },
  {
    id: 6,
    name: "Student Hub Hostel",
    price: 3000,
    area: "Hingna",
    rating: 4.3,
    reviews: 500,
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80"
  }
];

// Initialize icons from Lucide library (this turns <i data-lucide="..."> into actual SVG icons)
lucide.createIcons();

// ============================================
// 2. DOM ELEMENTS (Selecting HTML parts)
// ============================================
const roomContainer = document.getElementById("roomContainer");
const resultCountText = document.getElementById("resultCount");
const noResultsDiv = document.getElementById("noResults");

const heroAreaSelect = document.getElementById("heroAreaSelect");
const priceFilterInput = document.getElementById("priceFilter");
const quickAreaPills = document.querySelectorAll(".pill");

// ============================================
// 3. RENDER FUNCTION (Displaying HTML)
// ============================================
// This function takes an array of rooms and creates HTML cards for them.
function renderRooms(rooms) {
  // Clear the container first
  roomContainer.innerHTML = "";

  // Update the count text
  resultCountText.innerText = `${rooms.length} stays found`;

  // Show "No Results" message if array is empty
  if (rooms.length === 0) {
    noResultsDiv.classList.remove("hidden");
  } else {
    noResultsDiv.classList.add("hidden");
  }

  // Loop through each room in the array and create its HTML
  rooms.forEach(room => {
    // Generate the HTML card
    // We use backticks (`) to write HTML safely inside Javascript and insert variables with ${}
    const cardHTML = `
      <div class="card">
        <div class="card-image-wrap">
          <img src="${room.image}" alt="${room.name}" loading="lazy">
          
          <div class="card-badge badge-top-left">
            <i data-lucide="star" class="star-icon"></i> ${room.rating} (${room.reviews})
          </div>
          
          <div class="card-badge badge-top-right">
            <i data-lucide="heart"></i>
          </div>

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

    // Add exactly this piece of HTML to the container
    roomContainer.insertAdjacentHTML("beforeend", cardHTML);
  });

  // Re-run the Lucide function to convert the new <i> tags into icons
  lucide.createIcons();
}

// Initial Render (Load everything on startup)
renderRooms(roomsData);


// ============================================
// 4. FILTERING LOGIC
// ============================================
function applyFilters() {
  const selectedArea = heroAreaSelect.value;
  const maxPrice = priceFilterInput.value ? Number(priceFilterInput.value) : Infinity;

  // Filter the original array
  const filteredRooms = roomsData.filter(room => {
    // 1. Check if Area matches (or if 'all' is selected)
    const matchesArea = selectedArea === "all" || room.area === selectedArea;
    
    // 2. Check if Price is less than or equal to Max Price
    const matchesPrice = room.price <= maxPrice;

    return matchesArea && matchesPrice; // Keep only if BOTH conditions are true
  });

  // Render the newly filtered list
  renderRooms(filteredRooms);
}

// Listen for changes in inputs
heroAreaSelect.addEventListener("change", applyFilters);
priceFilterInput.addEventListener("input", applyFilters);

// Logic for clicking the quick "Pill" buttons on the Hero section
quickAreaPills.forEach(pill => {
  pill.addEventListener("click", () => {
    const areaName = pill.getAttribute("data-area"); // get the area name from html
    
    // Set the dropdown to match the pill
    heroAreaSelect.value = areaName;
    
    // Trigger the filter function
    applyFilters();
  });
});


// ============================================
// 5. MODAL (POPUP) UI LOGIC
// ============================================
const addRoomModal = document.getElementById("addRoomModal");
const loginModal = document.getElementById("loginModal");

// Open & Close triggers
document.getElementById("openAddRoomBtn").addEventListener("click", () => addRoomModal.classList.remove("hidden"));
document.getElementById("closeAddRoomBtn").addEventListener("click", () => addRoomModal.classList.add("hidden"));

document.getElementById("openLoginBtn").addEventListener("click", () => loginModal.classList.remove("hidden"));
document.getElementById("closeLoginBtn").addEventListener("click", () => loginModal.classList.add("hidden"));

// Open Signup (Switches from login for UI demo)
document.getElementById("openSignupBtn").addEventListener("click", (e) => {
  e.preventDefault(); // Stop link jumping to top
  alert("Redirecting to Signup Page... (Functionality to be added)");
});


// ============================================
// 6. ADD ROOM VALIDATION & LOGIC
// ============================================
const addRoomForm = document.getElementById("addRoomForm");
const formErrorText = document.getElementById("formError");

addRoomForm.addEventListener("submit", (e) => {
  e.preventDefault(); // Stop normal page reload on submit

  // Get values from inputs
  const name = document.getElementById("roomNameInput").value.trim();
  const price = document.getElementById("roomPriceInput").value.trim();
  const area = document.getElementById("roomAreaInput").value;
  let image = document.getElementById("roomImageInput").value.trim();

  // Basic Validation: Check if fields are empty
  if (name === "" || price === "" || area === "") {
    formErrorText.classList.remove("hidden");
    return; // stop here
  }

  // If no image is provided, use a random room placeholder
  if (image === "") {
    image = "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=800&q=80";
  }

  // Hide error text
  formErrorText.classList.add("hidden");

  // Create new room object
  const newRoom = {
    id: roomsData.length + 1, // Simple ID generator
    name: name,
    price: Number(price), // ensure price is a number
    area: area,
    rating: 4.0, // Default rating for new rooms
    reviews: 0,
    image: image
  };

  // Add to our main array
  roomsData.push(newRoom);

  // Close Modal and clear form
  addRoomModal.classList.add("hidden");
  addRoomForm.reset();

  // Re-apply filters to show new result cleanly
  applyFilters();
  
  alert("Room added successfully!");
});
