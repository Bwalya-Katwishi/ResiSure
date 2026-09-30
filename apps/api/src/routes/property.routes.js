const express = require('express');
const router = express.Router();
const PropertyController = require('../controllers/property.controller');
const { protect, restrictTo, optionalProtect } = require('../middleware/auth.middleware');
const { handleUpload } = require('../config/cloudinary');

// Static landlord route must be registered before /:id
router.get('/my/listings', protect, restrictTo('landlord'), PropertyController.getMyProperties);

// Public routes — optional JWT so students see is_favorite
router.get('/', optionalProtect, PropertyController.getAll);
router.get('/:id/trust-profile', optionalProtect, PropertyController.getTrustProfile);
router.get('/:id', optionalProtect, PropertyController.getOne);

// Landlord only routes
router.post('/', protect, restrictTo('landlord'), PropertyController.create);
router.put('/:id', protect, restrictTo('landlord'), PropertyController.update);
router.put('/:id/submit-review', protect, restrictTo('landlord'), PropertyController.submitForReview);
router.delete('/:id', protect, restrictTo('landlord'), PropertyController.remove);

// Image upload — up to 5 images per property
router.post(
  '/:id/images',
  protect,
  restrictTo('landlord'),
  handleUpload,
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