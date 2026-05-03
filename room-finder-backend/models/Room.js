const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

/**
 * Room Schema
 *
 * Stores all data about a single room listing in Nagpur.
 */
const roomSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Room title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Room price is required"],
      min: [0, "Price cannot be negative"],
    },
    area: {
      type: String,
      required: [true, "Area is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Detailed address is required"],
      trim: true,
    },
    whatsappNumber: {
      type: String,
      required: [true, "WhatsApp number is required"],
      trim: true,
    },
    facilities: {
      type: [String],
      default: ["wifi", "water"],
    },
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      }
    ],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Room must belong to an owner"],
    },
    // Keep legacy fields for backward compatibility if needed, or map them
    location: {
      type: String,
      trim: true,
    },
    amenities: {
      type: [String],
      default: [],
    },
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
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    status: {
      type: String,
      enum: ["available", "booked", "inquiry"],
      default: "available",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        // Ensure frontend gets 'area' if it expects 'location' and vice versa
        if (!ret.area) ret.area = ret.location;
        if (!ret.location) ret.location = ret.area;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

roomSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Room", roomSchema);

