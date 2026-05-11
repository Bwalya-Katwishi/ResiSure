const PropertyService = require('../services/property.service');

const PropertyController = {

  async create(req, res) {
    try {
      const property = await PropertyService.createProperty(req.user.id, req.body);
      return res.status(201).json({
        success: true,
        message: 'Property listed successfully',
        data: { property }
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to create property'
      });
    }
  },

  async getAll(req, res) {
    try {
      const filters = {
        min_price: req.query.min_price,
        max_price: req.query.max_price,
        area: req.query.area,
        verified: req.query.verified,
        available: req.query.available,
      };
      const properties = await PropertyService.getAllProperties(filters);
      return res.status(200).json({
        success: true,
        count: properties.length,
        data: { properties }
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to fetch properties'
      });
    }
  },

  async getOne(req, res) {
    try {
      const property = await PropertyService.getPropertyById(req.params.id);
      return res.status(200).json({
        success: true,
        data: { property }
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to fetch property'
      });
    }
  },

  async getMyProperties(req, res) {
    try {
      const properties = await PropertyService.getLandlordProperties(req.user.id);
      return res.status(200).json({
        success: true,
        count: properties.length,
        data: { properties }
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to fetch your properties'
      });
    }
  },

  async update(req, res) {
    try {
      const property = await PropertyService.updateProperty(
        req.params.id,
        req.user.id,
        req.body
      );
      return res.status(200).json({
        success: true,
        message: 'Property updated successfully',
        data: { property }
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to update property'
      });
    }
  },

  async remove(req, res) {
    try {
      await PropertyService.deleteProperty(req.params.id, req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Property removed successfully'
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to delete property'
      });
    }
  },

};

module.exports = PropertyController;