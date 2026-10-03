const express = require('express');
const { getCart, addItemToCart, updateCartItemQuantity, removeCartItem, clearCart } = require('../controllers/cartController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);

router.route('/')
  .get(getCart)
  .delete(clearCart);

router.post('/items', addItemToCart);

router.route('/items/:itemId')
  .put(updateCartItemQuantity)
  .delete(removeCartItem);

module.exports = router;
