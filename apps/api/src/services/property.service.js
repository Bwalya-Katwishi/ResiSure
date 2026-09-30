const PropertyModel = require('../models/property.model');
const PropertyImageModel = require('../models/propertyImage.model');
const NotificationService = require('./notification.service');
const AuditService = require('./audit.service');
const RiskFlagService = require('./riskFlag.service');
const VerificationGate = require('../utils/verification');
const { isValidCoordinate, stripPropertyLocation } = require('../utils/location');
const { parseAccommodationFields } = require('../utils/propertyAccommodation');
const { publicImageUrl, deleteStoredImage } = require('../config/cloudinary');
const pool = require('../config/database');

function parseOptionalCoordinates(data) {
  const hasLatitude = Object.prototype.hasOwnProperty.call(data, 'latitude');
  const hasLongitude = Object.prototype.hasOwnProperty.call(data, 'longitude');

  if (!hasLatitude && !hasLongitude) {
    return {};
  }

  if (data.latitude == null && data.longitude == null) {
    return { latitude: null, longitude: null };
  }

  if (!isValidCoordinate(data.latitude, data.longitude)) {
    throw { status: 400, message: 'latitude and longitude must be valid coordinates' };
  }

  return {
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
  };
}

function stripInternalPropertyFields(property) {
  if (!property) return property;
  const cleaned = { ...property };
  delete cleaned.landlord_user_id;
  return cleaned;
}

async function sanitizePropertyForViewer(property, userId = null) {
  if (!property) return property;

  const isOwner = Boolean(
    userId
    && property.landlord_user_id
    && String(property.landlord_user_id) === String(userId)
  );

  const cleaned = {
    ...property,
    is_owner: isOwner,
  };
  delete cleaned.landlord_user_id;

  if (!isOwner) {
    return stripPropertyLocation(cleaned);
  }

  return cleaned;
}

const PropertyService = {

  async createProperty(user_id, data) {
    await VerificationGate.requireVerifiedLandlord(user_id);

    const landlordProfile = await PropertyModel.getLandlordProfile(user_id);
    if (!landlordProfile) {
      throw { status: 404, message: 'Landlord profile not found' };
    }

    const { title, description, address, area, rent_per_month, total_rooms, property_type, amenities } = data;

    if (!title || !address || !area || rent_per_month === undefined || rent_per_month === null || rent_per_month === '') {
      throw { status: 400, message: 'title, address, area and rent_per_month are required' };
    }

    const rent = Number(rent_per_month);
    if (!Number.isFinite(rent) || rent <= 0) {
      throw { status: 400, message: 'Rent must be greater than zero' };
    }

    const rooms = parseInt(total_rooms, 10) || 1;
    if (rooms < 1 || rooms > 50) {
      throw { status: 400, message: 'total_rooms must be between 1 and 50' };
    }

    const coordinates = parseOptionalCoordinates(data);
    const accommodation = parseAccommodationFields({ ...data, total_rooms: rooms });

    const property = await PropertyModel.create({
      landlord_id: landlordProfile.id,
      title: String(title).trim(),
      description,
      address: String(address).trim(),
      area: String(area).trim(),
      rent_per_month: rent,
      total_rooms: rooms,
      property_type,
      amenities,
      ...coordinates,
      ...accommodation,
    });

    await AuditService.log({
      actor_id: user_id,
      action: 'PROPERTY_CREATED',
      entity_type: 'property',
      entity_id: property.id,
      metadata: { title: property.title, verification_status: property.verification_status },
    });

    await NotificationService.notifyAdmins({
      type: 'property_created',
      message: `New listing created: ${property.title} (awaiting listing verification)`,
      link: '/dashboard/admin',
    });

    try {
      await RiskFlagService.scanSuspiciousListing(property.id, {
        address: property.address,
        rent: property.rent_per_month,
        area: property.area,
        landlordUserId: user_id,
      });
      await RiskFlagService.scanRapidListingCreation(user_id);
    } catch (err) {
      console.error('Risk flag scan failed:', err.message);
    }

    return property;
  },

  async getAllProperties(filters) {
    const result = await PropertyModel.findAll(filters);
    result.properties = result.properties.map((property) => (
      stripInternalPropertyFields(stripPropertyLocation(property))
    ));
    return result;
  },

  async getPropertyById(id, userId = null) {
    if (!id || !/^[0-9a-f-]{36}$/i.test(String(id))) {
      throw { status: 400, message: 'Invalid property id' };
    }
    const property = await PropertyModel.findById(id, userId);
    if (!property) {
      throw { status: 404, message: 'Property not found' };
    }
    return sanitizePropertyForViewer(property, userId);
  },

  async getLandlordProperties(user_id) {
    const landlordProfile = await PropertyModel.getLandlordProfile(user_id);
    if (!landlordProfile) {
      throw { status: 404, message: 'Landlord profile not found' };
    }
    return PropertyModel.findByLandlordId(landlordProfile.id);
  },

  async updateProperty(id, user_id, data) {
    const property = await PropertyModel.findById(id);
    if (!property) {
      throw { status: 404, message: 'Property not found' };
    }

    const landlordProfile = await PropertyModel.getLandlordProfile(user_id);
    if (!landlordProfile || property.landlord_id !== landlordProfile.id) {
      throw { status: 403, message: 'You can only update your own properties' };
    }

    if (data.rent_per_month !== undefined && Number(data.rent_per_month) <= 0) {
      throw { status: 400, message: 'Rent must be greater than zero' };
    }

    const coordinates = parseOptionalCoordinates(data);
    const patch = { ...data, ...coordinates };

    const nextTotalRooms = data.total_rooms !== undefined
      ? parseInt(data.total_rooms, 10)
      : property.total_rooms;
    if (data.accommodation_gender !== undefined || data.total_rooms !== undefined
      || data.female_rooms_available !== undefined || data.male_rooms_available !== undefined) {
      const accommodation = parseAccommodationFields({
        accommodation_gender: data.accommodation_gender ?? property.accommodation_gender,
        total_rooms: nextTotalRooms,
        female_rooms_available: data.female_rooms_available ?? property.female_rooms_available,
        male_rooms_available: data.male_rooms_available ?? property.male_rooms_available,
      });
      Object.assign(patch, accommodation);
    }

    const updated = await PropertyModel.update(id, patch);

    const criticalFields = ['title', 'address', 'description', 'rent_per_month', 'total_rooms', 'area'];
    const changedCritical = criticalFields.some((field) => (
      data[field] !== undefined && String(data[field]) !== String(property[field])
    ));
    if (property.verification_status === 'verified' && changedCritical) {
      await PropertyModel.setVerification(id, { status: 'pending' });
      await AuditService.log({
        actor_id: user_id,
        action: 'PROPERTY_REVERIFICATION_REQUIRED',
        entity_type: 'property',
        entity_id: id,
        metadata: { reason: 'Critical listing field changed' },
      });
      await NotificationService.create({
        user_id,
        type: 'property_verification',
        message: `${property.title} was sent back to pending review because listing details changed.`,
        link: '/dashboard/landlord',
      });
    }

    const refreshed = await PropertyModel.findById(id);
    return sanitizePropertyForViewer(refreshed || updated, user_id);
  },

  async submitForReview(id, user_id) {
    const property = await PropertyModel.findById(id);
    if (!property) throw { status: 404, message: 'Property not found' };

    const landlordProfile = await PropertyModel.getLandlordProfile(user_id);
    if (!landlordProfile || property.landlord_id !== landlordProfile.id) {
      throw { status: 403, message: 'You can only submit your own properties' };
    }

    await VerificationGate.requireVerifiedLandlord(user_id);
    await VerificationGate.requireLandlordDocsForReview(user_id);

    if (!['pending', 'rejected'].includes(property.verification_status)) {
      throw { status: 400, message: 'Only pending or rejected listings can be submitted for review' };
    }

    const updated = await PropertyModel.setVerification(id, { status: 'under_review' });
    await NotificationService.notifyAdmins({
      type: 'property_verification',
      message: `${property.title} was submitted for verification`,
      link: '/dashboard/admin',
    });
    return updated;
  },

  async verifyProperty(id, admin_id, { status, rejection_reason }) {
    const property = await PropertyModel.findById(id);
    if (!property) throw { status: 404, message: 'Property not found' };
    if (!['verified', 'rejected', 'under_review', 'suspended'].includes(status)) {
      throw { status: 400, message: 'Status must be verified, rejected, under_review, or suspended' };
    }
    if (status === 'rejected' && !String(rejection_reason || '').trim()) {
      throw { status: 400, message: 'A rejection reason is required' };
    }

    if (status === 'verified') {
      const landlordProfile = await pool.query(
        `SELECT lp.verification_status
         FROM landlord_profiles lp
         WHERE lp.id = $1`,
        [property.landlord_id]
      );
      if (landlordProfile.rows[0]?.verification_status !== 'verified') {
        throw {
          status: 400,
          message: 'Verify the landlord account before approving this listing.',
          code: 'LANDLORD_NOT_VERIFIED',
        };
      }
    }

    const updated = await PropertyModel.setVerification(id, {
      status,
      rejection_reason: status === 'rejected' ? String(rejection_reason).trim() : null,
      verified_by: status === 'verified' ? admin_id : null,
    });

    const landlordUserId = await PropertyModel.getLandlordUserIdByPropertyId(id);
    await AuditService.log({
      actor_id: admin_id,
      action: status === 'verified'
        ? 'PROPERTY_VERIFIED'
        : status === 'rejected'
          ? 'PROPERTY_REJECTED'
          : status === 'suspended'
            ? 'PROPERTY_SUSPENDED'
            : 'PROPERTY_UNDER_REVIEW',
      entity_type: 'property',
      entity_id: id,
      metadata: { title: property.title, rejection_reason: updated.rejection_reason },
    });

    await NotificationService.create({
      user_id: landlordUserId,
      type: 'property_verification',
      message: status === 'verified'
        ? `Your listing "${property.title}" has been verified by ResiSure.`
        : status === 'rejected'
          ? `Your listing "${property.title}" was rejected: ${updated.rejection_reason}`
          : status === 'suspended'
            ? `Your listing "${property.title}" has been suspended and is no longer bookable.`
            : `Your listing "${property.title}" is under review.`,
      link: '/dashboard/landlord',
    });

    return updated;
  },

  async deleteProperty(id, user_id) {
    const property = await PropertyModel.findById(id);
    if (!property) {
      throw { status: 404, message: 'Property not found' };
    }

    const landlordProfile = await PropertyModel.getLandlordProfile(user_id);
    if (!landlordProfile || property.landlord_id !== landlordProfile.id) {
      throw { status: 403, message: 'You can only delete your own properties' };
    }

    await PropertyModel.delete(id);
  },

  async uploadImages(propertyId, userId, files, req) {
    if (!files || files.length === 0) {
      throw { status: 400, message: 'No images uploaded' };
    }

    const property = await PropertyModel.findById(propertyId);
    if (!property) {
      throw { status: 404, message: 'Property not found' };
    }

    const landlordProfile = await PropertyModel.getLandlordProfile(userId);
    if (!landlordProfile || property.landlord_id !== landlordProfile.id) {
      throw { status: 403, message: 'You can only upload images to your own properties' };
    }

    const currentCount = await PropertyImageModel.countByPropertyId(propertyId);
    if (currentCount + files.length > PropertyImageModel.maxPerProperty) {
      throw {
        status: 400,
        message: `You can only have ${PropertyImageModel.maxPerProperty} images per property. You currently have ${currentCount}.`,
      };
    }

    const entries = files.map((file, index) => ({
      imageUrl: publicImageUrl(req, file),
      isPrimary: currentCount === 0 && index === 0,
    }));

    await PropertyImageModel.insertMany(propertyId, entries);
    return PropertyImageModel.listByPropertyId(propertyId);
  },

  async deleteImage(propertyId, imageId, userId) {
    const property = await PropertyModel.findById(propertyId);
    if (!property) {
      throw { status: 404, message: 'Property not found' };
    }

    const landlordProfile = await PropertyModel.getLandlordProfile(userId);
    if (!landlordProfile || property.landlord_id !== landlordProfile.id) {
      throw { status: 403, message: 'You can only delete images from your own properties' };
    }

    const image = await PropertyImageModel.findByIdAndProperty(imageId, propertyId);
    if (!image) {
      throw { status: 404, message: 'Image not found' };
    }

    await deleteStoredImage(image.image_url);
    await PropertyImageModel.deleteById(imageId);
  },

};

module.exports = PropertyService;
