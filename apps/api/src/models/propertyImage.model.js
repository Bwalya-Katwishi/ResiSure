const pool = require('../config/database');

const MAX_IMAGES_PER_PROPERTY = 5;

const PropertyImageModel = {
  maxPerProperty: MAX_IMAGES_PER_PROPERTY,

  async countByPropertyId(propertyId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM property_images WHERE property_id = $1',
      [propertyId]
    );
    return parseInt(result.rows[0].count, 10);
  },

  async findByIdAndProperty(imageId, propertyId) {
    const result = await pool.query(
      'SELECT * FROM property_images WHERE id = $1 AND property_id = $2',
      [imageId, propertyId]
    );
    return result.rows[0] || null;
  },

  async insertMany(propertyId, entries) {
    const insertPromises = entries.map(({ imageUrl, isPrimary }) =>
      pool.query(
        'INSERT INTO property_images (property_id, image_url, is_primary) VALUES ($1, $2, $3)',
        [propertyId, imageUrl, isPrimary]
      )
    );
    await Promise.all(insertPromises);
  },

  async listByPropertyId(propertyId) {
    const result = await pool.query(
      'SELECT * FROM property_images WHERE property_id = $1 ORDER BY is_primary DESC',
      [propertyId]
    );
    return result.rows;
  },

  async deleteById(imageId) {
    await pool.query('DELETE FROM property_images WHERE id = $1', [imageId]);
  },
};

module.exports = PropertyImageModel;
