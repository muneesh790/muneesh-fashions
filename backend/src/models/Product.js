const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  sku: { 
    type: String, 
    required: true 
    // Not using unique: true here as it applies to embedded arrays unreliably.
    // SKU uniqueness will be enforced at the application layer/controller.
  },
  size: { type: String, required: true },
  color: { type: String, required: true },
  pricePaise: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 }
});

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  fileId: { type: String, required: true }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  description: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  collectionRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection'
  },
  images: {
    type: [imageSchema],
    validate: [v => v.length > 0, 'At least one image is required']
  },
  variants: {
    type: [variantSchema],
    validate: [v => v.length > 0, 'At least one variant is required']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
