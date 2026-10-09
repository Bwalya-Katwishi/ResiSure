const cloudinary = require('cloudinary').v2;

const hasCloudinary =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME)
  && Boolean(process.env.CLOUDINARY_API_KEY)
  && Boolean(process.env.CLOUDINARY_API_SECRET);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function parseCloudinaryUrl(url) {
  if (!url || !url.includes('res.cloudinary.com')) return null;
  try {
    const resourceMatch = url.match(/\/(image|raw|video)\/upload\//i);
    const resourceType = resourceMatch ? resourceMatch[1].toLowerCase() : 'image';
    const afterUpload = url.split('/upload/')[1];
    if (!afterUpload) return null;
    const pathPart = afterUpload.replace(/^v\d+\//, '');
    const lastDot = pathPart.lastIndexOf('.');
    const format = lastDot > -1 ? pathPart.slice(lastDot + 1).toLowerCase() : undefined;
    const publicId = lastDot > -1 ? pathPart.slice(0, lastDot) : pathPart;
    if (!publicId) return null;
    return { publicId, format, resourceType };
  } catch {
    return null;
  }
}

/** URL the API can fetch (signed when Cloudinary requires authentication). */
function resolveRemoteFetchUrl(storedUrl) {
  if (!storedUrl || !/^https?:\/\//i.test(storedUrl)) return storedUrl;
  if (!hasCloudinary) return storedUrl;

  const parsed = parseCloudinaryUrl(storedUrl);
  if (!parsed) return storedUrl;

  return cloudinary.url(parsed.publicId, {
    resource_type: parsed.resourceType,
    type: 'upload',
    sign_url: true,
    secure: true,
    ...(parsed.format ? { format: parsed.format } : {}),
  });
}

module.exports = {
  parseCloudinaryUrl,
  resolveRemoteFetchUrl,
};
