const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    ownerContact: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    messAvailable: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String,
      default: "https://via.placeholder.com/150",
      trim: true,
    },
    images: {
      type: [String],
      default: [],
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

roomSchema.virtual("area").get(function area() {
  return this.location;
});

module.exports = mongoose.model("Room", roomSchema);
