const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

/**
 * Room Schema
 *
 * Stores all data about a single room listing in Nagpur.
 */
const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Room name is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Room price is required"],
      min: [0, "Price cannot be negative"],
    },
    location: {
      type: String,
      required: [true, "Location / area is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Detailed address is required"],
      trim: true,
    },
    ownerContact: {
      type: String,
      required: [true, "Owner contact is required"],
      trim: true,
    },
    messAvailable: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String,
      default: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    // New Fields for Recommendation Engine
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
    amenities: {
      type: [String],
      default: ["Wifi", "Water"],
    },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    roomCount: {
      type: Number,
      default: 1,
      min: [1, "At least one room is required"],
    },
    availableRooms: {
      type: Number,
      default: 1,
      min: [0, "Available rooms cannot be negative"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.area = ret.location;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

roomSchema.virtual("area").get(function () {
  return this.location;
});

roomSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Room", roomSchema);

