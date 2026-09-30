const PropertyService = require('../services/property.service');
const TrustProfileService = require('../services/trustProfile.service');
const { sendError } = require('../utils/httpError');

const PropertyController = {

  async create(req, res) {
    try {
      const property = await PropertyService.createProperty(req.user.id, req.body);
      return res.status(201).json({
        success: true,
        message: 'Listing published successfully. It is now visible to students and awaiting listing verification.',
        data: { property }
      });
    } catch (err) {
      return sendError(res, err, 'Failed to create property');
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
        property_type: req.query.property_type,
        amenities: req.query.amenities,
        sort: req.query.sort,
        page: req.query.page,
        limit: req.query.limit,
        q: req.query.q,
        for_gender: req.query.for_gender,
        user_id: req.user?.id,
      };
      const { properties, pagination } = await PropertyService.getAllProperties(filters);
      return res.status(200).json({
        success: true,
        count: properties.length,
        pagination,
        data: { properties }
      });
    } catch (err) {
      return sendError(res, err, 'Failed to fetch properties');
    }
  },

  async getTrustProfile(req, res) {
    try {
      const trustProfile = await TrustProfileService.getPropertyTrustProfile(req.params.id);
      return res.status(200).json({ success: true, data: { trustProfile } });
    } catch (err) {
      return sendError(res, err, 'Failed to fetch trust profile');
    }
  },

  async getOne(req, res) {
    try {
      const property = await PropertyService.getPropertyById(req.params.id, req.user?.id);
      return res.status(200).json({
        success: true,
        data: { property }
      });
    } catch (err) {
      return sendError(res, err, 'Failed to fetch property');
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
      return sendError(res, err, 'Failed to fetch your properties');
    }
  },

  async update(req, res) {
    try {
      const property = await PropertyService.updateProperty(req.params.id, req.user.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Property updated successfully',
        data: { property }
      });
    } catch (err) {
      return sendError(res, err, 'Failed to update property');
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
      return sendError(res, err, 'Failed to delete property');
    }
  },

  async uploadImages(req, res) {
    try {
      const images = await PropertyService.uploadImages(
        req.params.id,
        req.user.id,
        req.files,
        req
      );
      return res.status(201).json({
        success: true,
        message: `${req.files.length} image(s) uploaded successfully`,
        data: { images },
      });
    } catch (err) {
      return sendError(res, err, 'Image upload failed');
    }
  },

  async submitForReview(req, res) {
    try {
      const property = await PropertyService.submitForReview(req.params.id, req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Listing submitted for verification',
        data: { property },
      });
    } catch (err) {
      return sendError(res, err, 'Failed to submit listing');
    }
  },

  async deleteImage(req, res) {
    try {
      await PropertyService.deleteImage(req.params.id, req.params.imageId, req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Image deleted successfully',
      });
    } catch (err) {
      return sendError(res, err, 'Image deletion failed');
    }
  },
};

module.exports = PropertyController;
