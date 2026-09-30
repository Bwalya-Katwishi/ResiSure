const FavoriteModel = require('../models/favorite.model');
const PropertyModel = require('../models/property.model');

const UUID = /^[0-9a-f-]{36}$/i;

const FavoriteService = {
  async add(userId, propertyId) {
    if (!UUID.test(String(propertyId))) {
      throw { status: 400, message: 'Invalid property id' };
    }
    const property = await PropertyModel.findById(propertyId);
    if (!property) {
      throw { status: 404, message: 'Property not found' };
    }
    if (property.status === 'unlisted') {
      throw { status: 400, message: 'This listing is no longer available' };
    }
    const created = await FavoriteModel.add(userId, propertyId);
    return { created: Boolean(created), property_id: propertyId };
  },

  async remove(userId, propertyId) {
    if (!UUID.test(String(propertyId))) {
      throw { status: 400, message: 'Invalid property id' };
    }
    const removed = await FavoriteModel.remove(userId, propertyId);
    if (!removed) {
      throw { status: 404, message: 'Listing is not in your saved list' };
    }
    return { property_id: propertyId };
  },

  async list(userId) {
    return FavoriteModel.listByUser(userId);
  },
};

module.exports = FavoriteService;
