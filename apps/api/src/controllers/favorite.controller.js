const FavoriteService = require('../services/favorite.service');
const { sendError } = require('../utils/httpError');

const FavoriteController = {
  async list(req, res) {
    try {
      const properties = await FavoriteService.list(req.user.id);
      return res.status(200).json({
        success: true,
        count: properties.length,
        data: { properties },
      });
    } catch (err) {
      return sendError(res, err, 'Failed to load saved listings');
    }
  },

  async add(req, res) {
    try {
      const propertyId = req.params.propertyId || req.body?.property_id;
      const result = await FavoriteService.add(req.user.id, propertyId);
      return res.status(result.created ? 201 : 200).json({
        success: true,
        message: result.created ? 'Listing saved' : 'Listing already saved',
        data: result,
      });
    } catch (err) {
      return sendError(res, err, 'Failed to save listing');
    }
  },

  async remove(req, res) {
    try {
      const result = await FavoriteService.remove(req.user.id, req.params.propertyId);
      return res.status(200).json({
        success: true,
        message: 'Removed from saved listings',
        data: result,
      });
    } catch (err) {
      return sendError(res, err, 'Failed to remove saved listing');
    }
  },
};

module.exports = FavoriteController;
