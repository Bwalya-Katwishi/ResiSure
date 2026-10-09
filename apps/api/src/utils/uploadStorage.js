function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET
  );
}

/** New uploads: local disk on this server unless UPLOAD_STORAGE=cloudinary. */
function useCloudinaryUploads() {
  const mode = String(process.env.UPLOAD_STORAGE || 'local').trim().toLowerCase();
  if (mode === 'cloudinary') return cloudinaryConfigured();
  if (mode === 'local' || mode === 'disk' || mode === 'ec2') return false;
  return false;
}

module.exports = { cloudinaryConfigured, useCloudinaryUploads };
