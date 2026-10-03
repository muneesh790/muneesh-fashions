exports.authorizeAdmin = (req, res, next) => {
  // Assumes authenticate middleware has already run and populated req.user
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      status: 'error', 
      message: 'Forbidden: Admin access required.' 
    });
  }
  next();
};
