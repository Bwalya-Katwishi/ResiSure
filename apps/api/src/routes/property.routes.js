const express = require('express');
const router = express.Router();
const PropertyController = require('../controllers/property.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// Public routes — anyone can browse listings
router.get('/', PropertyController.getAll);
router.get('/:id', PropertyController.getOne);

// Landlord only routes
router.post('/', protect, restrictTo('landlord'), PropertyController.create);
router.get('/my/listings', protect, restrictTo('landlord'), PropertyController.getMyProperties);
router.put('/:id', protect, restrictTo('landlord'), PropertyController.update);
router.delete('/:id', protect, restrictTo('landlord'), PropertyController.remove);

module.exports = router;