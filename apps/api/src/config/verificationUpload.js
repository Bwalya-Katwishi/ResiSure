const path = require('path');

const fs = require('fs');

const crypto = require('crypto');

const multer = require('multer');

const cloudinary = require('cloudinary').v2;

const {

  validateVerificationBuffer,

  assertAllowedVerificationMime,

  MAX_VERIFICATION_DOC_BYTES,

} = require('../utils/fileValidation');



const docsDir = path.join(__dirname, '../../uploads/verification');

fs.mkdirSync(docsDir, { recursive: true });



const LOCAL_PREFIX = 'local:';



const hasCloudinary =

  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&

  Boolean(process.env.CLOUDINARY_API_KEY) &&

  Boolean(process.env.CLOUDINARY_API_SECRET);



if (hasCloudinary) {

  cloudinary.config({

    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,

    api_key: process.env.CLOUDINARY_API_KEY,

    api_secret: process.env.CLOUDINARY_API_SECRET,

  });

}



const EXT_BY_KIND = {

  jpeg: '.jpg',

  png: '.png',

  webp: '.webp',

  pdf: '.pdf',

};



const docFilter = (req, file, cb) => {

  try {

    assertAllowedVerificationMime(file.mimetype, { label: file.fieldname || 'Document' });

    cb(null, true);

  } catch (err) {

    cb(new Error(err.message));

  }

};



const upload = multer({

  storage: multer.memoryStorage(),

  fileFilter: docFilter,

  limits: { fileSize: MAX_VERIFICATION_DOC_BYTES },

});



function handleUploadError(err, res, next) {

  if (!err) return next();

  if (err.code === 'LIMIT_FILE_SIZE') {

    return res.status(400).json({

      success: false,

      message: 'Each document must be under 8MB',

    });

  }

  return res.status(400).json({

    success: false,

    message: err.message || 'Document upload failed',

  });

}



const handleVerificationUpload = (req, res, next) => {

  upload.single('document')(req, res, (err) => handleUploadError(err, res, next));

};



const handleLandlordVerificationUpload = (req, res, next) => {

  upload.fields([

    { name: 'nrc_document', maxCount: 1 },

    { name: 'land_document', maxCount: 1 },

  ])(req, res, (err) => handleUploadError(err, res, next));

};



const handleStudentVerificationUpload = (req, res, next) => {

  upload.fields([

    { name: 'nrc_document', maxCount: 1 },

    { name: 'university_slip', maxCount: 1 },

  ])(req, res, (err) => handleUploadError(err, res, next));

};



async function uploadBufferToCloudinary(buffer) {

  return new Promise((resolve, reject) => {

    const stream = cloudinary.uploader.upload_stream(

      {

        folder: 'resisure/verification',

        resource_type: 'auto',


      },

      (err, result) => {

        if (err) return reject(err);

        resolve(result.secure_url);

      }

    );

    stream.end(buffer);

  });

}



function writeBufferToLocalDisk(buffer, kind) {

  const ext = EXT_BY_KIND[kind] || '.pdf';

  const filename = `${crypto.randomBytes(24).toString('hex')}${ext}`;

  fs.writeFileSync(path.join(docsDir, filename), buffer);

  return `${LOCAL_PREFIX}${filename}`;

}



const FIELD_LABELS = {

  nrc_document: 'NRC document',

  land_document: 'Title deed document',

  university_slip: 'University confirmation slip',

};



/** Validate magic bytes, then persist to private storage. Returns opaque ref. */

async function persistVerifiedDocument(file) {

  if (!file?.buffer) {

    throw { status: 400, message: 'Document upload is missing file data' };

  }



  const label = FIELD_LABELS[file.fieldname] || 'Document';

  assertAllowedVerificationMime(file.mimetype, { label });

  const kind = validateVerificationBuffer(file.buffer, { label });



  if (hasCloudinary) {

    try {

      return await uploadBufferToCloudinary(file.buffer);

    } catch (err) {

      console.error('Cloudinary verification upload failed:', err.message);

      throw { status: 400, message: 'We could not store your document. Please try again.' };

    }

  }



  return writeBufferToLocalDisk(file.buffer, kind);

}



/** @deprecated use persistVerifiedDocument — kept for legacy refs in DB */

function storeDocReference(file) {

  if (file.path && String(file.path).startsWith('http')) {

    return file.path;

  }

  if (file.filename) {

    return `${LOCAL_PREFIX}${file.filename}`;

  }

  return null;

}



function isLocalDocRef(ref) {

  if (!ref) return false;

  if (ref.startsWith(LOCAL_PREFIX)) return true;

  return ref.includes('/uploads/verification/');

}



function isRemoteDocRef(ref) {

  return Boolean(ref && /^https?:\/\//i.test(ref));

}



function localFilenameFromRef(ref) {

  if (!ref) return null;

  if (ref.startsWith(LOCAL_PREFIX)) return ref.slice(LOCAL_PREFIX.length);

  if (ref.includes('/uploads/verification/')) {

    return path.basename(ref.split('?')[0]);

  }

  return null;

}



function resolveLocalDocPath(ref) {

  const filename = localFilenameFromRef(ref);

  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {

    return null;

  }

  return path.join(docsDir, filename);

}



function contentTypeForFilename(filename) {

  const ext = path.extname(filename || '').toLowerCase();

  if (ext === '.pdf') return 'application/pdf';

  if (ext === '.png') return 'image/png';

  if (ext === '.webp') return 'image/webp';

  return 'image/jpeg';

}



/** Never expose raw storage URLs — always authenticated API routes */

function secureDocUrl(_ref, { forAdmin = false, userId, role = 'landlord', docType = 'land' } = {}) {

  if (!_ref || !userId) return null;

  if (forAdmin) {

    if (role === 'student') {

      return `/api/admin/students/${userId}/verification-document?type=${docType}`;

    }

    return `/api/admin/landlords/${userId}/verification-document?type=${docType}`;

  }

  if (role === 'student') {

    return `/api/students/me/verification/document?type=${docType}`;

  }

  return `/api/landlords/me/verification/document?type=${docType}`;

}



module.exports = {

  handleVerificationUpload,

  handleLandlordVerificationUpload,

  handleStudentVerificationUpload,

  persistVerifiedDocument,

  storeDocReference,

  isLocalDocRef,

  isRemoteDocRef,

  localFilenameFromRef,

  resolveLocalDocPath,

  contentTypeForFilename,

  secureDocUrl,

  docsDir,

  LOCAL_PREFIX,

  MAX_VERIFICATION_DOC_BYTES,

};

