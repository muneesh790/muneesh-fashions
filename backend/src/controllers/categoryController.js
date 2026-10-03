const Category = require('../models/Category');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    res.status(200).json({ status: 'success', data: { categories } });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res, next) => {
  try {
    const { name, slug, description } = req.body;
    if (!name || !slug) return res.status(400).json({ status: 'error', message: 'Name and slug are required' });

    const normalizedSlug = slug.trim().toLowerCase();
    const existing = await Category.findOne({ slug: normalizedSlug });
    if (existing) return res.status(409).json({ status: 'error', message: 'Category slug already exists' });

    const category = await Category.create({ name, slug: normalizedSlug, description });
    res.status(201).json({ status: 'success', data: { category } });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid Category ID' });
    }

    let updateData = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) updateData.name = req.body.name;
    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) updateData.description = req.body.description;
    
    if (Object.prototype.hasOwnProperty.call(req.body, 'slug')) {
      updateData.slug = req.body.slug.trim().toLowerCase();
      const existing = await Category.findOne({ slug: updateData.slug, _id: { $ne: req.params.id } });
      if (existing) return res.status(409).json({ status: 'error', message: 'Category slug already exists' });
    }

    const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ status: 'error', message: 'Category not found' });

    res.status(200).json({ status: 'success', data: { category } });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid Category ID' });
    }

    const productsUsingCategory = await Product.countDocuments({ category: req.params.id });
    if (productsUsingCategory > 0) {
      return res.status(400).json({ status: 'error', message: 'Cannot delete category because it is referenced by existing products' });
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ status: 'error', message: 'Category not found' });

    res.status(200).json({ status: 'success', message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};
