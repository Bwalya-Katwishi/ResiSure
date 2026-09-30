const express = require('express');
const router = express.Router();
const FavoriteController = require('../controllers/favorite.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.use(protect, restrictTo('student'));

router.get('/', FavoriteController.list);
router.post('/', FavoriteController.add);
router.delete('/:propertyId', FavoriteController.remove);

module.exports = router;
