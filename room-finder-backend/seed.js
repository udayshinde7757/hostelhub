require("dotenv").config();
const mongoose = require("mongoose");
const Room = require("./models/Room");

const sampleRooms = [
  {
    name: "Sunset Sky Hostel",
    price: 4500,
    location: "Dharampeth",
    ownerContact: "9876543210",
    messAvailable: true,
    rating: 4.8,
    reviewsCount: 120,
    amenities: ["Wifi", "AC", "Mess", "Water"],
    coordinates: { lat: 21.1418, lng: 79.0682 },
    image: "https://images.unsplash.com/photo-1555854817-5b2247a8175f?w=800&q=80"
  },
  {
    name: "Urban Living Space",
    price: 5500,
    location: "Sitabuldi",
    ownerContact: "9876543211",
    messAvailable: false,
    rating: 4.5,
    reviewsCount: 85,
    amenities: ["Wifi", "Water", "Parking"],
    coordinates: { lat: 21.1458, lng: 79.0882 },
    image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80"
  },
  {
    name: "Tech Park Residence",
    price: 6000,
    location: "IT Park",
    ownerContact: "9876543212",
    messAvailable: true,
    rating: 4.9,
    reviewsCount: 200,
    amenities: ["Wifi", "AC", "Mess", "Parking"],
    coordinates: { lat: 21.1118, lng: 79.0582 },
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80"
  },
  {
    name: "Cozy Corner Rooms",
    price: 2800,
    location: "Sadar",
    ownerContact: "9876543213",
    messAvailable: false,
    rating: 4.2,
    reviewsCount: 45,
    amenities: ["Wifi", "Water"],
    coordinates: { lat: 21.1618, lng: 79.0882 },
    image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80"
  },
  {
    name: "Student Hub Hostel",
    price: 3000,
    location: "Hingna",
    ownerContact: "9876543214",
    messAvailable: true,
    rating: 4.0,
    reviewsCount: 30,
    amenities: ["Wifi", "Mess", "Water"],
    coordinates: { lat: 21.0918, lng: 79.0082 },
    image: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80"
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/roomsathi");
    console.log("Connected to DB for seeding...");
    
    await Room.deleteMany({});
    console.log("Cleared existing rooms.");
    
    await Room.insertMany(sampleRooms);
    console.log("Seeded sample rooms successfully.");
    
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedDB();
