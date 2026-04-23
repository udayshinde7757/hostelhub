const mongoose = require("mongoose");

/**
 * Room Schema
 *
 * Stores all data about a single room listing in Nagpur.
 * Every field is carefully typed and validated.
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
      // A real Unsplash photo is used so the UI never shows broken images
      default:
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
  },
  {
    // Automatically add createdAt and updatedAt fields
    timestamps: true,

    // Control how documents look when sent as JSON to the frontend
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // Add a plain string "id" field that the frontend can use easily
        ret.id = ret._id.toString();
        // Add "area" as an alias for "location" so the old frontend still works
        ret.area = ret.location;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual getter – lets you do room.area anywhere in backend code too
roomSchema.virtual("area").get(function () {
  return this.location;
});

module.exports = mongoose.model("Room", roomSchema);
