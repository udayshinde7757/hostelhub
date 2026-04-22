const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors()); // Allow frontend to communicate without cross-origin errors
app.use(express.json()); // Parse JSON data arriving from frontend POST requests

// ============================================
// DUMMY DATABASE (Data moved from frontend)
// ============================================
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

// ============================================
// API ROUTES
// ============================================

// 1. GET /rooms -> Respond with the list of rooms
app.get('/rooms', (req, res) => {
  try {
    res.json(roomsData);
  } catch (error) {
    res.status(500).json({ error: "Server error while fetching rooms." });
  }
});

// 2. POST /rooms -> Add a new room from the frontend form
app.post('/rooms', (req, res) => {
  try {
    const { name, price, area, image } = req.body;

    // Backend Validation
    if (!name || !price || !area) {
      return res.status(400).json({ error: "Room Name, Price, and Area are required." });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: "Price must be a valid positive number." });
    }

    // Create the new room object
    const newRoom = {
      id: roomsData.length > 0 ? roomsData[roomsData.length - 1].id + 1 : 1, // Auto-increment ID safely
      name: name.trim(),
      price: Number(price),
      area: area,
      rating: 4.0, // Default rating
      reviews: 0,
      image: image ? image.trim() : "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=800&q=80"
    };

    roomsData.push(newRoom);
    
    // Respond back to frontend that it was successful
    res.status(201).json({ message: "Room added successfully!", room: newRoom });
  } catch (error) {
    res.status(500).json({ error: "Server error while adding room." });
  }
});

// 3. POST /login -> Mock user login
app.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // For now, accept any dummy login
    res.json({ message: "Welcome to RoomSathi! Login successful." });
  } catch (error) {
    res.status(500).json({ error: "Server error during login." });
  }
});

// 4. POST /signup -> Mock user signup
app.post('/signup', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // Accept dummy signup
    res.status(201).json({ message: "Account created successfully! Please login." });
  } catch (error) {
    res.status(500).json({ error: "Server error during signup." });
  }
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});
