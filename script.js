// ============================================
// CONFIGURATION & GLOBAL STATE
// ============================================
const CONFIG = {
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
// API HANDLER (Standardized)
// ============================================
const api = {
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_URL}${endpoint}`;
    const headers = { ...options.headers };
    
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const result = await response.json();
      
      if (!response.ok) {
        console.error(`API Error [${response.status}] ${endpoint}:`, result);
        throw new Error(result.message || result.status || 'Something went wrong');
      }

      // Backend now returns standardized { success, data, message }
      return result;
    } catch (err) {
      console.error(`Fetch error on ${endpoint}:`, err);
      throw err;
    }
  },
  get(endpoint, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`${endpoint}${qs ? '?' + qs : ''}`, { method: 'GET' });
  },
  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  },
  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  },
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

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
    <i data-lucide="${type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-circle' : 'info')}" 
       style="color: ${type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#3b82f6')}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function renderSkeletons(containerId, count = 6) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Array(count).fill(`
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-title skeleton"></div>
      <div class="skeleton-text skeleton"></div>
      <div class="skeleton-footer skeleton"></div>
    </div>
  `).join('');
}

function getAmenityIcon(name) {
  const icons = {
    'wifi': 'wifi', 'water': 'droplets', 'parking': 'car', 'ac': 'wind',
    'food': 'utensils', 'bed': 'bed', 'tv': 'tv', 'laundry': 'shirt'
  };
  return icons[name.toLowerCase()] || 'check-circle';
}

// ============================================
// RENDER FUNCTIONS
// ============================================
function renderRooms(rooms, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (!rooms || rooms.length === 0) {
    if (containerId === 'roomContainer') {
      container.innerHTML = `
        <div class="no-results">
          <img src="https://cdni.iconscout.com/illustration/premium/thumb/no-data-found-8867280-7223910.png" class="empty-illustration" alt="No results">
          <h3>No rooms found in this area</h3>
          <p>Try adjusting your search or price filter.</p>
          <button class="btn-primary" style="margin-top:20px" onclick="window.location.reload()">Reset Search</button>
        </div>
      `;
      container.style.gridTemplateColumns = '1fr';
    }
    return;
  }

  container.style.gridTemplateColumns = '';

  rooms.forEach((room, index) => {
    const card = document.createElement('div');
    card.className = containerId === 'recentlyViewedContainer' ? 'card recently-viewed-card' : 'card';
    card.style.animationDelay = `${index * 0.05}s`;
    
    const roomImages = room.images && room.images.length > 0 
      ? room.images.map(img => typeof img === 'object' ? img.url : img)
      : (room.image ? [room.image] : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"]);
    
    const isBooked = room.status === 'booked';
    const isInquiry = room.status === 'inquiry';
    const isVerified = room.isVerified;

    card.innerHTML = `
      <div class="card-image-wrap" onclick="openRoomDetails('${room.id || room._id}')">
        <img src="${roomImages[0].startsWith('http') ? roomImages[0] : CONFIG.API_URL.replace('/api/v1', '') + roomImages[0]}" alt="${room.title}" loading="lazy">
        ${isVerified ? `<div class="verified-badge"><i data-lucide="shield-check" style="width:14px;height:14px"></i> Verified</div>` : ''}
        <div class="card-badge badge-top-left" style="top: ${isVerified ? '45px' : '15px'}">
          <i data-lucide="star" class="star-icon" style="color:#f59e0b; fill:#f59e0b; width:14px"></i> 
          ${Number(room.rating || 4.5).toFixed(1)}
        </div>
        ${isBooked ? `<div class="card-badge badge-top-right not-available-badge">Not Available</div>` 
          : isInquiry ? `<div class="card-badge badge-top-right inquiry-badge">In Demand</div>`
          : `<div class="card-badge badge-top-right available-badge">Available</div>`}
        <div class="price-badge-overlay">₹${Number(room.price).toLocaleString('en-IN')}</div>
        <div class="image-content">
          <h3>${room.title || room.name}</h3>
          <p><i data-lucide="map-pin" style="width:14px;height:14px;"></i> ${room.area || room.location}</p>
        </div>
        <div class="view-details-overlay">View Details</div>
      </div>
      <div class="card-body" onclick="openRoomDetails('${room.id || room._id}')">
        <div class="amenities">
          ${(room.facilities || room.amenities || ["wifi", "water"]).slice(0, 4).map(a => `
            <div class="amenity-icon" title="${a}"><i data-lucide="${getAmenityIcon(a)}" style="width:18px"></i></div>
          `).join('')}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
  lucide.createIcons();
}

window.openRoomDetails = async function(roomId) {
  const room = state.allRooms.find(r => (r.id || r._id) === roomId) 
             || state.recommendedRooms.find(r => (r.id || r._id) === roomId) 
             || JSON.parse(localStorage.getItem('recentlyViewed') || '[]').find(r => (r.id || r._id) === roomId);
  if (!room) return;

  addToRecentlyViewed(room);

  const modal = document.getElementById('roomDetailsModal');
  const title = document.getElementById('detailTitle');
  const price = document.getElementById('detailPrice');
  const area = document.getElementById('detailArea');
  const description = document.getElementById('detailDescription');
  const facilities = document.getElementById('detailFacilities');
  const address = document.getElementById('detailAddress');
  const bookBtn = document.getElementById('whatsappBookBtn');

  title.innerText = room.title || room.name;
  price.innerText = Number(room.price).toLocaleString('en-IN');
  area.innerText = room.area || room.location;
  description.innerText = room.description || "Experience comfort and convenience in this premium stay.";
  address.innerText = room.address || "Address available on request.";

  currentGalleryImages = room.images && room.images.length > 0 
    ? room.images.map(img => typeof img === 'object' ? img.url : img)
    : (room.image ? [room.image] : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"]);
  
  currentGalleryIndex = 0;
  updateGallery();

  const isBooked = room.status === 'booked';
  bookBtn.onclick = async () => {
    if (isBooked) return;
    if (!state.token) {
      showToast("Please login to contact the landlord.", "error");
      document.getElementById('loginModal').classList.remove('hidden');
      document.getElementById('loginModal').classList.add('active');
      return;
    }

    const waNumber = room.whatsappNumber || room.ownerContact;
    if (!waNumber || waNumber.length < 10) {
      return showToast("Invalid WhatsApp number provided by landlord.", "error");
    }

    bookBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Redirecting...';
    lucide.createIcons();
    
    try {
      await api.post(`/rooms/${room.id || room._id}/click`, {});
    } catch (e) { console.error("Analytics tracking failed", e); }
    
    setTimeout(() => {
      const msg = encodeURIComponent(`Hello, I'm interested in your room in ${room.area} (₹${room.price}). I saw this on RoomSathi.`);
      window.open(`https://wa.me/${waNumber}?text=${msg}`, '_blank');
      bookBtn.innerHTML = '<i data-lucide="message-circle"></i> Book via WhatsApp';
      lucide.createIcons();
      showToast('Opening WhatsApp...', 'success');
    }, 800);
  };

  if (isBooked) {
    bookBtn.innerText = "Not Available";
    bookBtn.classList.add('btn-disabled');
    bookBtn.disabled = true;
  } else {
    bookBtn.classList.remove('btn-disabled');
    bookBtn.disabled = false;
    bookBtn.innerHTML = '<i data-lucide="message-circle"></i> Book via WhatsApp';
  }

  const roomFacilities = room.facilities || room.amenities || ["wifi", "water", "food", "bed"];
  facilities.innerHTML = roomFacilities.map(f => `
    <div class="facility-tag"><i data-lucide="${getAmenityIcon(f)}" style="width:16px"></i> ${f}</div>
  `).join('');

  modal.classList.remove('hidden');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
};

let currentGalleryIndex = 0;
let currentGalleryImages = [];

function updateGallery() {
  const gallery = document.getElementById('roomGallery');
  const dotsContainer = document.getElementById('galleryDots');
  gallery.style.transform = `translateX(-${currentGalleryIndex * 100}%)`;
  gallery.innerHTML = currentGalleryImages.map(url => `<img src="${url.startsWith('http') ? url : CONFIG.API_URL.replace('/api/v1', '') + url}" alt="Room">`).join('');
  dotsContainer.innerHTML = currentGalleryImages.map((_, i) => `<div class="dot ${i === currentGalleryIndex ? 'active' : ''}" onclick="goToImage(${i})"></div>`).join('');
}

window.goToImage = (i) => { currentGalleryIndex = i; updateGallery(); };

document.getElementById('prevGallery')?.addEventListener('click', () => {
  currentGalleryIndex = currentGalleryIndex > 0 ? currentGalleryIndex - 1 : currentGalleryImages.length - 1;
  updateGallery();
});

document.getElementById('nextGallery')?.addEventListener('click', () => {
  currentGalleryIndex = currentGalleryIndex < currentGalleryImages.length - 1 ? currentGalleryIndex + 1 : 0;
  updateGallery();
});

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => {
    m.classList.remove('active');
    setTimeout(() => m.classList.add('hidden'), 300);
  });
  document.body.style.overflow = '';
}

document.querySelectorAll('.close-btn').forEach(btn => btn.onclick = closeAllModals);
window.onclick = (e) => { if (e.target.classList.contains('modal')) closeAllModals(); };

// ============================================
// MARKETPLACE LOGIC
// ============================================
function syncFiltersToURL(filters) {
  const url = new URL(window.location);
  Object.keys(filters).forEach(k => {
    if (filters[k]) url.searchParams.set(k, filters[k]);
    else url.searchParams.delete(k);
  });
  window.history.pushState({}, '', url);
  updateSEOMetadata(filters);
}

function updateSEOMetadata(filters) {
  const area = filters.area || 'Nagpur';
  document.title = `Verified Rooms in ${area} - RoomSathi`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', `Find premium student housing in ${area}. Verified landlords on RoomSathi.`);
}

function getFiltersFromURL() {
  const p = new URLSearchParams(window.location.search);
  return {
    area: p.get('area') || '',
    keyword: p.get('keyword') || '',
    maxPrice: p.get('maxPrice') || '',
    sortBy: p.get('sortBy') || 'recommended'
  };
}

function addToRecentlyViewed(room) {
  let viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
  viewed = viewed.filter(r => (r.id || r._id) !== (room.id || room._id));
  viewed.unshift(room);
  if (viewed.length > 4) viewed.pop();
  localStorage.setItem('recentlyViewed', JSON.stringify(viewed));
  renderRecentlyViewed();
}

function renderRecentlyViewed() {
  const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
  const section = document.getElementById('recentlyViewedSection');
  if (viewed.length === 0) return section.classList.add('hidden');
  section.classList.remove('hidden');
  renderRooms(viewed, 'recentlyViewedContainer');
}

function showErrorMessage(show = true) {
  document.getElementById('errorScreen').classList.toggle('hidden', !show);
  document.getElementById('roomContainer').classList.toggle('hidden', show);
}

// ============================================
// CORE ACTIONS
// ============================================
async function initApp() {
  lucide.createIcons();
  updateAuthUI();
  const filters = getFiltersFromURL();
  if (filters.area) {
    document.getElementById('heroAreaSelect').value = filters.area;
    document.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p.getAttribute('data-area') === filters.area));
  }
  if (filters.keyword) document.getElementById('keywordFilter').value = filters.keyword;
  if (filters.maxPrice) document.getElementById('priceFilter').value = filters.maxPrice;
  if (filters.sortBy) document.getElementById('sortBy').value = filters.sortBy;

  updateSEOMetadata(filters);
  await getUserLocation();
  loadAllRooms(filters);
  renderRecentlyViewed();
  
  document.getElementById('retryBtn').onclick = () => loadAllRooms(getFiltersFromURL());
  document.getElementById('sortBy').onchange = (e) => {
    const f = { ...getFiltersFromURL(), sortBy: e.target.value };
    syncFiltersToURL(f);
    loadAllRooms(f);
  };

  document.querySelectorAll('.pill').forEach(pill => {
    pill.onclick = () => {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const area = pill.getAttribute('data-area');
      const f = { ...getFiltersFromURL(), area: area === 'all' ? '' : area };
      syncFiltersToURL(f);
      loadAllRooms(f);
    };
  });
}

async function loadAllRooms(filters = {}) {
  try {
    showErrorMessage(false);
    renderSkeletons('roomContainer', 6);
    const res = await api.get('/rooms', filters);
    state.allRooms = res.data;
    renderRooms(state.allRooms, 'roomContainer');
    document.getElementById('resultCount').innerText = `${res.results || state.allRooms.length} verified stays in Nagpur`;
  } catch (err) {
    showErrorMessage(true);
    showToast(err.message, 'error');
  }
}

// ============================================
// AUTH HANDLERS
// ============================================
function updateAuthUI() {
  const loginBtn = document.getElementById('authEntryBtn');
  const addRoomBtn = document.getElementById('openAddRoomBtn');
  const myRoomsBtn = document.getElementById('myRoomsBtn');
  
  if (state.token) {
    loginBtn.innerHTML = '<i data-lucide="log-out" style="width:16px;height:16px"></i> Logout';
    loginBtn.onclick = (e) => { e.preventDefault(); logout(); };
    
    if (state.user && (state.user.role === 'landlord' || state.user.role === 'admin')) {
      addRoomBtn.classList.remove('hidden');
      myRoomsBtn.classList.remove('hidden');
    } else {
      addRoomBtn.classList.add('hidden');
      myRoomsBtn.classList.add('hidden');
    }
  } else {
    loginBtn.innerHTML = 'Login';
    loginBtn.onclick = (e) => { e.preventDefault(); document.getElementById('loginModal').classList.remove('hidden'); };
    addRoomBtn.classList.add('hidden');
    myRoomsBtn.classList.add('hidden');
  }
  lucide.createIcons();
}

async function loadMyRooms() {
  try {
    const res = await api.get('/rooms/my');
    renderMyRooms(res.data);
    document.getElementById('myRoomsModal').classList.remove('hidden');
    document.getElementById('myRoomsModal').classList.add('active');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderMyRooms(rooms) {
  const container = document.getElementById('myRoomsContainer');
  if (!container) return;
  container.innerHTML = '';

  if (rooms.length === 0) {
    container.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">You haven\'t listed any rooms yet.</div>';
    return;
  }

  rooms.forEach(room => {
    const card = document.createElement('div');
    card.className = 'card';
    const roomImages = room.images && room.images.length > 0 
      ? room.images.map(img => typeof img === 'object' ? img.url : img)
      : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"];

    card.innerHTML = `
      <div class="card-image-wrap">
        <img src="${roomImages[0].startsWith('http') ? roomImages[0] : CONFIG.API_URL.replace('/api/v1', '') + roomImages[0]}" alt="${room.title}">
        <div class="card-badge badge-top-right ${room.status === 'available' ? 'available-badge' : 'not-available-badge'}">
          ${room.status}
        </div>
      </div>
      <div class="card-body">
        <h4>${room.title}</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">${room.area}</p>
        <div class="btn-row" style="gap: 10px;">
          <button class="btn-secondary" style="flex: 1; padding: 8px;" onclick="toggleRoomStatus('${room.id || room._id}')">
            Status
          </button>
          <button class="btn-secondary" style="flex: 1; padding: 8px; color: #ef4444;" onclick="deleteRoom('${room.id || room._id}')">
            Delete
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

window.deleteRoom = async function(id) {
  if (!confirm('Are you sure you want to delete this listing?')) return;
  try {
    await api.delete(`/rooms/${id}`);
    showToast('Listing removed');
    loadMyRooms();
    loadAllRooms(getFiltersFromURL());
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.toggleRoomStatus = async function(id) {
  try {
    await api.request(`/rooms/${id}/status`, { method: 'PATCH' });
    showToast('Status updated');
    loadMyRooms();
    loadAllRooms(getFiltersFromURL());
  } catch (err) {
    showToast(err.message, 'error');
  }
};

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
  } catch (err) { showToast(err.message, 'error'); }
}

async function handleSignup(e) {
  e.preventDefault();
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const role = document.querySelector('input[name="role"]:checked').value;
  try {
    const res = await api.post('/auth/signup', { email, password, role });
    state.token = res.token;
    state.user = res.data.user;
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    showToast('Account created!');
    document.getElementById('signupModal').classList.add('hidden');
    updateAuthUI();
  } catch (err) { showToast(err.message, 'error'); }
}

function logout() {
  state.token = null; state.user = null;
  localStorage.removeItem('token'); localStorage.removeItem('user');
  showToast('Logged out');
  updateAuthUI();
}

// ============================================
// ROOM ACTIONS
// ============================================
async function handleAddRoom(e) {
  e.preventDefault();
  if (!state.token) return showToast('Please login', 'error');

  const fileInput = document.getElementById('roomImagesInput');
  if (fileInput.files.length === 0) return showToast('At least one image is required.', 'error');

  const formData = new FormData();
  formData.append('title', document.getElementById('roomTitleInput').value);
  formData.append('description', document.getElementById('roomDescriptionInput').value);
  formData.append('price', document.getElementById('roomPriceInput').value);
  formData.append('area', document.getElementById('roomAreaInput').value);
  formData.append('address', document.getElementById('roomAddressInput').value);
  formData.append('whatsappNumber', document.getElementById('roomWhatsAppInput').value);
  formData.append('facilities', document.getElementById('roomFacilitiesInput').value);
  
  for (let i = 0; i < fileInput.files.length; i++) {
    formData.append('images', fileInput.files[i]);
  }

  try {
    showToast('Listing your property...', 'info');
    await api.post('/rooms', formData);
    showToast('Room listed successfully!');
    
    // GUARANTEE REFETCH CONSISTENCY
    await loadAllRooms(getFiltersFromURL());
    
    closeAllModals();
    document.getElementById('addRoomForm').reset();
    document.getElementById('imagePreviewContainer').innerHTML = '';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Image preview handler
document.getElementById('roomImagesInput')?.addEventListener('change', (e) => {
  const container = document.getElementById('imagePreviewContainer');
  container.innerHTML = '';
  const files = e.target.files;
  for (let i = 0; i < files.length; i++) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const div = document.createElement('div');
      div.className = 'preview-item';
      div.innerHTML = `<img src="${event.target.result}">`;
      container.appendChild(div);
    };
    reader.readAsDataURL(files[i]);
  }
});

// ============================================
// EVENT LISTENERS
// ============================================
document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
document.getElementById('signupForm')?.addEventListener('submit', handleSignup);
document.getElementById('addRoomForm')?.addEventListener('submit', handleAddRoom);

document.getElementById('keywordFilter')?.addEventListener('input', debounce((e) => {
  const f = { ...getFiltersFromURL(), keyword: e.target.value };
  syncFiltersToURL(f);
  loadAllRooms(f);
}, 400));

document.getElementById('priceFilter')?.addEventListener('input', debounce((e) => {
  const f = { ...getFiltersFromURL(), maxPrice: e.target.value };
  syncFiltersToURL(f);
  loadAllRooms(f);
}, 400));

document.getElementById('heroAreaSelect')?.addEventListener('change', (e) => {
  const f = { ...getFiltersFromURL(), area: e.target.value === 'all' ? '' : e.target.value };
  syncFiltersToURL(f);
  loadAllRooms(f);
});

document.getElementById('myRoomsBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  loadMyRooms();
});

document.getElementById('openAddRoomBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (!state.token) return showToast('Please login first', 'error');
  document.getElementById('addRoomModal').classList.remove('hidden');
  document.getElementById('addRoomModal').classList.add('active');
});

document.getElementById('openSignupBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('loginModal').classList.add('hidden');
  document.getElementById('signupModal').classList.remove('hidden');
  document.getElementById('signupModal').classList.add('active');
});

document.getElementById('backToLoginBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('signupModal').classList.add('hidden');
  document.getElementById('loginModal').classList.remove('hidden');
  document.getElementById('loginModal').classList.add('active');
});

document.getElementById('closeRoomDetailsBtn')?.addEventListener('click', closeAllModals);
document.getElementById('hideMapBtn')?.addEventListener('click', () => document.getElementById('mapSection').classList.add('hidden'));

async function getUserLocation() {
  return new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          state.currentLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          resolve(state.currentLocation);
        },
        () => {
          state.currentLocation = CONFIG.DEFAULT_CENTER;
          resolve(state.currentLocation);
        }
      );
    } else {
      state.currentLocation = CONFIG.DEFAULT_CENTER;
      resolve(state.currentLocation);
    }
  });
}

window.showAllRoomsMap = function(e) {
  if (e) e.preventDefault();
  if (!window.google || !window.google.maps) return showToast("Maps not loaded", "error");
  if (!state.currentLocation) return showToast("Location unknown", "error");

  const mapSection = document.getElementById('mapSection');
  mapSection.classList.remove('hidden');
  mapSection.scrollIntoView({ behavior: 'smooth' });

  if (!map) {
    map = new google.maps.Map(document.getElementById('map'), { zoom: 12, center: state.currentLocation });
  } else {
    map.setCenter(state.currentLocation);
  }

  state.allRooms.forEach(room => {
    if (room.coordinates?.lat) {
      const pos = new google.maps.LatLng(room.coordinates.lat, room.coordinates.lng);
      const marker = new google.maps.Marker({ position: pos, map, title: room.title });
      const info = new google.maps.InfoWindow({ content: `<div><b>${room.title}</b><br>₹${room.price}</div>` });
      marker.addListener("click", () => info.open(map, marker));
    }
  });
};

document.getElementById('openDirectionsBtn')?.addEventListener('click', showAllRoomsMap);

initApp();
