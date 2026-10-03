const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');



const app = express();

// Middleware
// Configure CORS for separate customer and admin frontends
app.use(cors({
  origin: [process.env.CUSTOMER_FRONTEND_URL, process.env.ADMIN_FRONTEND_URL],
  credentials: true // Crucial for HTTP-only cookies later
}));

// Basic JSON parsing middleware
app.use(express.json());

// Cookie parsing middleware
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);



// Basic health-check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Muneesh Fashions API is running smoothly.' });
});

// Centralized 404 handler for unknown routes
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Not Found - ${req.originalUrl}`
  });
});

// Centralized error-handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
