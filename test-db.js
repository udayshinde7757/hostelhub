const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/roomsathi')
  .then(() => console.log('MongoDB is properly connected'))
  .catch(e => console.error('Connection failed:', e.message))
  .finally(() => process.exit());
