const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (fileInput, folder = "rooms") => {
  if (!fileInput) {
    return Promise.reject(new Error("No file input provided for upload"));
  }

  if (Buffer.isBuffer(fileInput)) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      streamifier.createReadStream(fileInput).pipe(stream);
    });
  }

  return cloudinary.uploader.upload(fileInput, { folder });
};

module.exports = { uploadToCloudinary };
