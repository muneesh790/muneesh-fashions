const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product' // Used for linking back, but other fields are snapshots
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  pricePaise: { type: Number, required: true, min: 0 },
  size: { type: String, required: true },
  color: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 }
});

const orderAddressSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true, default: 'India' }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: {
    type: [orderItemSchema],
    validate: [v => v.length > 0, 'Order must have at least one item']
  },
  subtotalPaise: { type: Number, required: true, min: 0 },
  shippingFeePaise: { type: Number, required: true, min: 0 },
  totalAmountPaise: { type: Number, required: true, min: 0 },
  shippingAddress: {
    type: orderAddressSchema,
    required: true
  },
  orderStatus: {
    type: String,
    enum: ['pending_payment', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending_payment'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  razorpayOrderId: {
    type: String,
    required: true
  },
  razorpayPaymentId: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
