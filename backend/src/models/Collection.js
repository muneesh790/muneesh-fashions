const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String
  },
  image: {
    url: { type: String },
    fileId: { type: String }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Collection', collectionSchema);
