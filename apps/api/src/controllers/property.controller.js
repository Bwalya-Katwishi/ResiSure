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
      const property = await PropertyService.updateProperty(req.params.id, req.user.id, req.body);
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
async uploadImages(req, res) {
    try {
      const { id } = req.params;
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No images uploaded' });
      }
      const property = await PropertyService.getPropertyById(id);
      const landlordProfile = await require('../models/property.model').getLandlordProfile(req.user.id);
      if (!landlordProfile || property.landlord_id !== landlordProfile.id) {
        return res.status(403).json({ success: false, message: 'You can only upload images to your own properties' });
      }
      const pool = require('../config/database');
      const existingImages = await pool.query(
        'SELECT COUNT(*) FROM property_images WHERE property_id = $1',
        [id]
      );
      const currentCount = parseInt(existingImages.rows[0].count);
      if (currentCount + req.files.length > 5) {
        return res.status(400).json({
          success: false,
          message: `You can only have 5 images per property. You currently have ${currentCount}.`,
        });
      }
      const insertPromises = req.files.map((file, index) =>
        pool.query(
          'INSERT INTO property_images (property_id, image_url, is_primary) VALUES ($1, $2, $3)',
          [id, file.path, currentCount === 0 && index === 0]
        )
      );
      await Promise.all(insertPromises);
      const images = await pool.query(
        'SELECT * FROM property_images WHERE property_id = $1 ORDER BY is_primary DESC',
        [id]
      );
      return res.status(201).json({
        success: true,
        message: `${req.files.length} image(s) uploaded successfully`,
        data: { images: images.rows },
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Image upload failed',
      });
    }
  },

  async deleteImage(req, res) {
    try {
      const { id, imageId } = req.params;
      const pool = require('../config/database');
      const { cloudinary } = require('../config/cloudinary');
      const image = await pool.query(
        'SELECT * FROM property_images WHERE id = $1 AND property_id = $2',
        [imageId, id]
      );
      if (!image.rows[0]) {
        return res.status(404).json({ success: false, message: 'Image not found' });
      }
      // Extract public_id from cloudinary URL and delete from cloudinary
      const imageUrl = image.rows[0].image_url;
      const publicId = imageUrl.split('/').slice(-2).join('/').replace(/\.[^/.]+$/, '');
      await cloudinary.uploader.destroy(publicId);
      await pool.query('DELETE FROM property_images WHERE id = $1', [imageId]);
      return res.status(200).json({
        success: true,
        message: 'Image deleted successfully',
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Image deletion failed',
      });
    }
  },
};

module.exports = PropertyController;