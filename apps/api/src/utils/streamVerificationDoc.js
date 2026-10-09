const fs = require('fs');
const {
  isRemoteDocRef,
  resolveLocalDocPath,
  localFilenameFromRef,
  contentTypeForFilename,
} = require('../config/verificationUpload');
const { resolveRemoteFetchUrl } = require('./cloudinaryDoc');
const { streamRemoteDocument } = require('./streamRemoteDoc');

async function streamVerificationDocumentRef(ref, res, { docType, label = 'document' } = {}) {
  if (!ref) {
    throw { status: 404, message: 'Document not found' };
  }

  if (isRemoteDocRef(ref)) {
    let filename = localFilenameFromRef(ref);
    if (!filename) {
      try {
        filename = ref.split('/').pop()?.split('?')[0] || `${docType || label}-document.pdf`;
      } catch {
        filename = `${docType || label}-document.pdf`;
      }
    }
    const fetchUrl = resolveRemoteFetchUrl(ref);
    await streamRemoteDocument(fetchUrl, res, {
      filename: `${docType || label}-${filename}`.replace(/[^a-zA-Z0-9._-]/g, '_'),
      contentType: contentTypeForFilename(filename),
    });
    return;
  }

  const filePath = resolveLocalDocPath(ref);
  if (!filePath || !fs.existsSync(filePath)) {
    throw { status: 404, message: 'Document file not found on server. Please re-upload your document.' };
  }

  const filename = localFilenameFromRef(ref);
  res.setHeader('Content-Type', contentTypeForFilename(filename));
  res.setHeader('Content-Disposition', `inline; filename="${docType}-${filename}"`);
  res.setHeader('Cache-Control', 'private, no-store');

  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      reject({ status: 404, message: 'Document file not found on server. Please re-upload your document.', cause: err });
    });
    res.on('finish', resolve);
    res.on('error', reject);
    stream.pipe(res);
  });
}

module.exports = { streamVerificationDocumentRef };
