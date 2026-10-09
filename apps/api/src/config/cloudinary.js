const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const uploadsDir = path.join(__dirname, '../../uploads/properties');
const profilesDir = path.join(__dirname, '../../uploads/profiles');
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(profilesDir, { recursive: true });

const { cloudinaryConfigured, useCloudinaryUploads } = require('../utils/uploadStorage');
const hasCloudinary = cloudinaryConfigured();
const storeOnCloudinary = useCloudinaryUploads();

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Only JPG, PNG and WebP images are allowed'));
  }
  cb(null, true);
};

const storage = storeOnCloudinary
  ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'resisure/properties',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1200, height: 800, crop: 'fill', quality: 'auto' }],
      },
    })
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadsDir),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
        const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`);
      },
    });

const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const handleUpload = (req, res, next) => {
  upload.array('images', 5)(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Each image must be under 5MB' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, message: 'You can upload a maximum of 5 images' });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'Image upload failed',
    });
  });
};

const profileStorage = storeOnCloudinary
  ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'resisure/profiles',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }],
      },
    })
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, profilesDir),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
        const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`);
      },
    });

const profileUpload = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const handleProfilePhotoUpload = (req, res, next) => {
  profileUpload.single('photo')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Profile photo must be under 5MB' });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'Profile photo upload failed',
    });
  });
};

function publicImageUrl(req, file) {
  if (file.path && String(file.path).startsWith('http')) {
    return file.path;
  }
  const base = process.env.API_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  const folder = file.destination && String(file.destination).includes('profiles')
    ? 'profiles'
    : 'properties';
  return `${base}/uploads/${folder}/${file.filename}`;
}

async function deleteStoredImage(imageUrl) {
  if (!imageUrl) return;

  if (hasCloudinary && imageUrl.includes('res.cloudinary.com')) {
    const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (match) {
      const publicId = match[1].replace(/\.[^/.]+$/, '');
      await cloudinary.uploader.destroy(publicId);
    }
    return;
  }

  if (imageUrl.includes('/uploads/properties/') || imageUrl.includes('/uploads/profiles/')) {
    const filename = path.basename(imageUrl.split('?')[0]);
    const dir = imageUrl.includes('/uploads/profiles/') ? profilesDir : uploadsDir;
    fs.unlink(path.join(dir, filename), () => {});
  }
}

if (!storeOnCloudinary) {
  console.log('Photo and profile uploads stored on this server (apps/api/uploads)');
}

module.exports = {
  cloudinary,
  upload,
  handleUpload,
  handleProfilePhotoUpload,
  publicImageUrl,
  deleteStoredImage,
  uploadsDir,
  profilesDir,
};
