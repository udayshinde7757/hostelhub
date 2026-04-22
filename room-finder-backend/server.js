const express = require("express");
const app = express();

const PORT = 3000;

app.use(express.json());

let rooms = [
  {
    id: 1,
    name: "Sai Hostel",
    price: 5000,
    location: "Dharampeth",
    image: "https://via.placeholder.com/150",
  },
  {
    id: 2,
    name: "Shivam Rooms",
    price: 3500,
    location: "Hingna",
    image: "https://via.placeholder.com/150",
  },
  {
    id: 3,
    name: "Green Stay",
    price: 6000,
    location: "Sitabuldi",
    image: "https://via.placeholder.com/150",
  },
];

app.get("/", (req, res) => {
  res.send("Server is running successfully");
});

app.get("/rooms", (req, res) => {
  const location = req.query.location;

  if (location) {
    const filteredRooms = rooms.filter(
      (room) => room.location.toLowerCase() === location.toLowerCase()
    );
    return res.json(filteredRooms);
  }

  res.json(rooms);
});

app.post("/rooms", (req, res) => {
  const { name, price, location, image } = req.body;

  if (!name || !price || !location) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const newRoom = {
    id: rooms.length + 1,
    name,
    price,
    location,
    image: image || "https://via.placeholder.com/150",
  };

  rooms.push(newRoom);

  res.status(201).json({
    message: "Room added successfully",
    room: newRoom,
  });
});

app.delete("/rooms/:id", (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  const index = rooms.findIndex((room) => room.id === roomId);

  if (index === -1) {
    return res.status(404).json({ message: "Room not found" });
  }

  const deletedRoom = rooms.splice(index, 1);

  res.json({
    message: "Room deleted successfully",
    room: deletedRoom,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
