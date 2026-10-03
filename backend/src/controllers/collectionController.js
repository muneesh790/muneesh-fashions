const Collection = require('../models/Collection');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// @desc    Get all collections
// @route   GET /api/collections
// @access  Public
exports.getCollections = async (req, res, next) => {
  try {
    const collections = await Collection.find();
    res.status(200).json({ status: 'success', data: { collections } });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a collection
// @route   POST /api/collections
// @access  Private/Admin
exports.createCollection = async (req, res, next) => {
  try {
    const { name, slug, description, image } = req.body;
    if (!name || !slug) return res.status(400).json({ status: 'error', message: 'Name and slug are required' });

    const normalizedSlug = slug.trim().toLowerCase();
    const existing = await Collection.findOne({ slug: normalizedSlug });
    if (existing) return res.status(409).json({ status: 'error', message: 'Collection slug already exists' });

    const collection = await Collection.create({ name, slug: normalizedSlug, description, image });
    res.status(201).json({ status: 'success', data: { collection } });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a collection
// @route   PUT /api/collections/:id
// @access  Private/Admin
exports.updateCollection = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid Collection ID' });
    }

    let updateData = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) updateData.name = req.body.name;
    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) updateData.description = req.body.description;
    if (Object.prototype.hasOwnProperty.call(req.body, 'image')) updateData.image = req.body.image;
    
    if (Object.prototype.hasOwnProperty.call(req.body, 'slug')) {
      updateData.slug = req.body.slug.trim().toLowerCase();
      const existing = await Collection.findOne({ slug: updateData.slug, _id: { $ne: req.params.id } });
      if (existing) return res.status(409).json({ status: 'error', message: 'Collection slug already exists' });
    }

    const collection = await Collection.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!collection) return res.status(404).json({ status: 'error', message: 'Collection not found' });

    res.status(200).json({ status: 'success', data: { collection } });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a collection
// @route   DELETE /api/collections/:id
// @access  Private/Admin
exports.deleteCollection = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid Collection ID' });
    }

    const productsUsingCollection = await Product.countDocuments({ collectionRef: req.params.id });
    if (productsUsingCollection > 0) {
      return res.status(400).json({ status: 'error', message: 'Cannot delete collection because it is referenced by existing products' });
    }

    const collection = await Collection.findByIdAndDelete(req.params.id);
    if (!collection) return res.status(404).json({ status: 'error', message: 'Collection not found' });

    res.status(200).json({ status: 'success', message: 'Collection deleted successfully' });
  } catch (error) {
    next(error);
  }
};
