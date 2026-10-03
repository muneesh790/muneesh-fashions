const Product = require('../models/Product');
const Category = require('../models/Category');
const Collection = require('../models/Collection');
const mongoose = require('mongoose');

// Helper to validate product data (slug, category, collection, sku uniqueness, size+color combo)
const validateProductData = async (data, productId = null) => {
  const { slug, category, collectionRef, variants } = data;

  // Validate Category
  if (!category || !mongoose.Types.ObjectId.isValid(category)) throw new Error('Invalid or missing category ID');
  const catExists = await Category.findById(category);
  if (!catExists) throw new Error('Referenced category does not exist');

  // Validate Collection (if provided)
  if (collectionRef) {
    if (!mongoose.Types.ObjectId.isValid(collectionRef)) throw new Error('Invalid collection ID');
    const colExists = await Collection.findById(collectionRef);
    if (!colExists) throw new Error('Referenced collection does not exist');
  }

  // Validate Slug Uniqueness
  const slugQuery = { slug: slug.trim().toLowerCase() };
  if (productId) slugQuery._id = { $ne: productId };
  const existingSlug = await Product.findOne(slugQuery);
  if (existingSlug) throw new Error('Product slug already exists');

  // Validate Variants (SKU uniqueness & size+color combo)
  if (!variants || !Array.isArray(variants) || variants.length === 0) {
    throw new Error('At least one variant is required');
  }

  const skus = [];
  const combos = [];
  for (const variant of variants) {
    if (!variant.sku || !variant.size || !variant.color || variant.pricePaise === undefined || variant.stock === undefined) {
      throw new Error('Variant missing required fields (sku, size, color, pricePaise, stock)');
    }
    if (variant.pricePaise < 0 || variant.stock < 0) {
      throw new Error('Variant pricePaise and stock must be >= 0');
    }
    skus.push(variant.sku);
    const combo = `${variant.size.trim().toLowerCase()}-${variant.color.trim().toLowerCase()}`;
    if (combos.includes(combo)) {
      throw new Error(`Duplicate size+color combination found within the product: ${variant.size} - ${variant.color}`);
    }
    combos.push(combo);
  }

  // Check SKU uniqueness within the same product array
  if (new Set(skus).size !== skus.length) {
    throw new Error('Duplicate SKUs found within the provided variants');
  }

  // Check SKU uniqueness across ALL products in DB
  const skuQuery = { 'variants.sku': { $in: skus } };
  if (productId) skuQuery._id = { $ne: productId };
  const existingSkuProduct = await Product.findOne(skuQuery);
  if (existingSkuProduct) {
    throw new Error('One or more SKUs are already in use by another product');
  }
};

// @desc    Get all products (public)
// @route   GET /api/products
// @access  Public (admin can see all, public sees active)
exports.getProducts = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 20;
    
    if (page < 1) page = 1;
    if (limit < 1) limit = 20;
    if (limit > 100) limit = 100;
    
    const startIndex = (page - 1) * limit;

    // Determine visibility based on user role (using req.user set by authMiddleware if token is present)
    // Actually, for a purely public endpoint without auth, req.user won't exist.
    // If we want admin to see inactive, they should use a separate route or we parse their token.
    // We'll enforce isActive: true for all requests on this route for simplicity.
    const query = { isActive: true };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('collectionRef', 'name slug')
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      status: 'success',
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product by slug
// @route   GET /api/products/:slug
// @access  Public
exports.getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug.toLowerCase(), isActive: true })
      .populate('category', 'name slug description')
      .populate('collectionRef', 'name slug description image');

    if (!product) return res.status(404).json({ status: 'error', message: 'Product not found or inactive' });

    res.status(200).json({ status: 'success', data: { product } });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res, next) => {
  try {
    const { name, slug, description, category, collectionRef, images, variants, isActive } = req.body;

    if (!name || !slug || !description || !images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields or images' });
    }

    try {
      await validateProductData(req.body);
    } catch (valError) {
      return res.status(400).json({ status: 'error', message: valError.message });
    }

    const product = await Product.create({
      name,
      slug: slug.trim().toLowerCase(),
      description,
      category,
      collectionRef,
      images,
      variants,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({ status: 'success', data: { product } });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product (incl deactivation)
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid Product ID' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ status: 'error', message: 'Product not found' });

    const updatedData = {};
    const allowedFields = ['name', 'slug', 'description', 'isActive', 'category', 'collectionRef', 'images', 'variants'];
    
    allowedFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updatedData[field] = req.body[field];
      }
    });

    if (updatedData.slug) updatedData.slug = updatedData.slug.trim().toLowerCase();
    
    const hasCategory = Object.prototype.hasOwnProperty.call(updatedData, 'category');
    const hasCollectionRef = Object.prototype.hasOwnProperty.call(updatedData, 'collectionRef');
    const hasVariants = Object.prototype.hasOwnProperty.call(updatedData, 'variants');
    const hasSlug = Object.prototype.hasOwnProperty.call(updatedData, 'slug');

    if (hasCategory || hasCollectionRef || hasVariants || hasSlug) {
      const dataToValidate = {
        slug: hasSlug ? updatedData.slug : product.slug,
        category: hasCategory ? updatedData.category : product.category,
        collectionRef: hasCollectionRef ? updatedData.collectionRef : product.collectionRef,
        variants: hasVariants ? updatedData.variants : product.variants
      };
      
      try {
        await validateProductData(dataToValidate, req.params.id);
      } catch (valError) {
        return res.status(400).json({ status: 'error', message: valError.message });
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updatedData, { new: true, runValidators: true });
    res.status(200).json({ status: 'success', data: { product: updatedProduct } });
  } catch (error) {
    next(error);
  }
};
