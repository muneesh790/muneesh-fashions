const express = require('express');
const { getCollections, createCollection, updateCollection, deleteCollection } = require('../controllers/collectionController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/', getCollections);
router.post('/', authenticate, authorizeAdmin, createCollection);
router.put('/:id', authenticate, authorizeAdmin, updateCollection);
router.delete('/:id', authenticate, authorizeAdmin, deleteCollection);

module.exports = router;
