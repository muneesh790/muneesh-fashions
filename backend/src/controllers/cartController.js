const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name images variants isActive slug'
      });

    // For V1, if a cart doesn't exist yet, we return an empty representation
    // rather than hitting the DB with an unnecessary INSERT operation.
    if (!cart) {
      return res.status(200).json({
        status: 'success',
        data: {
          cart: {
            user: req.user._id,
            items: []
          }
        }
      });
    }

    res.status(200).json({ status: 'success', data: { cart } });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
exports.addItemToCart = async (req, res, next) => {
  try {
    const { productId, variantId, quantity } = req.body;

    if (!productId || !variantId || quantity === undefined) {
      return res.status(400).json({ status: 'error', message: 'productId, variantId, and quantity are required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ status: 'error', message: 'Quantity must be at least 1' });
    }

    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid productId or variantId format' });
    }

    // Always fetch latest product/variant info from DB, never trust frontend
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ status: 'error', message: 'Product not found' });
    if (!product.isActive) return res.status(400).json({ status: 'error', message: 'Product is currently inactive' });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ status: 'error', message: 'Variant not found in this product' });

    if (quantity > variant.stock) {
      return res.status(400).json({ status: 'error', message: `Requested quantity exceeds available stock (${variant.stock})` });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Check if exactly the same product + variant exists in the cart already
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId && item.variantId.toString() === variantId
    );

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      if (newQuantity > variant.stock) {
        return res.status(400).json({ status: 'error', message: `Resulting quantity (${newQuantity}) exceeds available stock (${variant.stock})` });
      }
      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].variantSku = variant.sku; // Refresh SKU just in case it was updated
    } else {
      cart.items.push({
        product: productId,
        variantId: variantId,
        variantSku: variant.sku, // Store authoritative SKU directly from DB
        quantity: quantity
      });
    }

    await cart.save();
    
    // Populate for the response
    await cart.populate({
      path: 'items.product',
      select: 'name images variants isActive slug'
    });

    res.status(200).json({ status: 'success', data: { cart } });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:itemId
// @access  Private
exports.updateCartItemQuantity = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    if (quantity === undefined || quantity < 1) {
      return res.status(400).json({ status: 'error', message: 'Valid quantity (>= 1) is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid item ID format' });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ status: 'error', message: 'Cart not found' });

    // Use Mongoose subdocument .id() to find the specific item by its _id
    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ status: 'error', message: 'Item not found in your cart' });

    // Re-verify product and variant states using the item's stored references
    const product = await Product.findById(item.product);
    if (!product) return res.status(404).json({ status: 'error', message: 'Referenced product no longer exists' });
    if (!product.isActive) return res.status(400).json({ status: 'error', message: 'Product is currently inactive' });

    const variant = product.variants.id(item.variantId);
    if (!variant) return res.status(404).json({ status: 'error', message: 'Referenced variant no longer exists' });

    if (quantity > variant.stock) {
      return res.status(400).json({ status: 'error', message: `Requested quantity exceeds available stock (${variant.stock})` });
    }

    item.quantity = quantity;
    item.variantSku = variant.sku; // Refresh SKU

    await cart.save();
    
    await cart.populate({
      path: 'items.product',
      select: 'name images variants isActive slug'
    });

    res.status(200).json({ status: 'success', data: { cart } });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove cart item
// @route   DELETE /api/cart/items/:itemId
// @access  Private
exports.removeCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid item ID format' });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ status: 'error', message: 'Cart not found' });

    // Remove the item directly using Mongoose subdoc .pull()
    cart.items.pull({ _id: itemId });
    
    await cart.save();
    
    await cart.populate({
      path: 'items.product',
      select: 'name images variants isActive slug'
    });

    res.status(200).json({ status: 'success', data: { cart } });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    
    if (cart) {
      cart.items = [];
      await cart.save();
    } else {
      cart = { user: req.user._id, items: [] };
    }

    res.status(200).json({ status: 'success', message: 'Cart cleared successfully', data: { cart } });
  } catch (error) {
    next(error);
  }
};
