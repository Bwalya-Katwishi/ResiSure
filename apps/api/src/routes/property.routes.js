const express = require('express');
const router = express.Router();
const PropertyController = require('../controllers/property.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { upload } = require('../config/cloudinary');

// Public routes
router.get('/', PropertyController.getAll);
router.get('/:id', PropertyController.getOne);

// Landlord only routes
router.post('/', protect, restrictTo('landlord'), PropertyController.create);
router.get('/my/listings', protect, restrictTo('landlord'), PropertyController.getMyProperties);
router.put('/:id', protect, restrictTo('landlord'), PropertyController.update);
router.delete('/:id', protect, restrictTo('landlord'), PropertyController.remove);

// Image upload — up to 5 images per property
router.post(
  '/:id/images',
  protect,
  restrictTo('landlord'),
  upload.array('images', 5),
  PropertyController.uploadImages
);

// Delete a specific image
router.delete(
  '/:id/images/:imageId',
  protect,
  restrictTo('landlord'),
  PropertyController.deleteImage
);

module.exports = router;