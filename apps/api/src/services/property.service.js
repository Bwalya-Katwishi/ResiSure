const PropertyModel = require('../models/property.model');

const PropertyService = {

  async createProperty(user_id, data) {
    // Get the landlord profile for this user
    const landlordProfile = await PropertyModel.getLandlordProfile(user_id);
    if (!landlordProfile) {
      throw { status: 404, message: 'Landlord profile not found' };
    }

    const { title, description, address, area, rent_per_month, total_rooms } = data;

    if (!title || !address || !area || !rent_per_month) {
      throw { status: 400, message: 'title, address, area and rent_per_month are required' };
    }

    if (rent_per_month <= 0) {
      throw { status: 400, message: 'Rent must be greater than zero' };
    }

    const property = await PropertyModel.create({
      landlord_id: landlordProfile.id,
      title,
      description,
      address,
      area,
      rent_per_month,
      total_rooms: total_rooms || 1,
    });

    return property;
  },

  async getAllProperties(filters) {
    return await PropertyModel.findAll(filters);
  },

  async getPropertyById(id) {
    const property = await PropertyModel.findById(id);
    if (!property) {
      throw { status: 404, message: 'Property not found' };
    }
    return property;
  },

  async getLandlordProperties(user_id) {
    const landlordProfile = await PropertyModel.getLandlordProfile(user_id);
    if (!landlordProfile) {
      throw { status: 404, message: 'Landlord profile not found' };
    }
    return await PropertyModel.findByLandlordId(landlordProfile.id);
  },

  async updateProperty(id, user_id, data) {
    // Confirm the property belongs to this landlord
    const property = await PropertyModel.findById(id);
    if (!property) {
      throw { status: 404, message: 'Property not found' };
    }

    const landlordProfile = await PropertyModel.getLandlordProfile(user_id);
    if (property.landlord_id !== landlordProfile.id) {
      throw { status: 403, message: 'You can only update your own properties' };
    }

    return await PropertyModel.update(id, data);
  },

  async deleteProperty(id, user_id) {
    const property = await PropertyModel.findById(id);
    if (!property) {
      throw { status: 404, message: 'Property not found' };
    }

    const landlordProfile = await PropertyModel.getLandlordProfile(user_id);
    if (property.landlord_id !== landlordProfile.id) {
      throw { status: 403, message: 'You can only delete your own properties' };
    }

    await PropertyModel.delete(id);
  },

};

module.exports = PropertyService;