const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function getImageUrl(img) {
  if (!img) return null;
  const url = typeof img === 'string' ? img : img.image_url;
  if (!url) return null;
  if (url.startsWith('/uploads/')) return `${API_BASE}${url}`;
  return url;
}

export function getImageId(img) {
  if (!img || typeof img === 'string') return null;
  return img.id || null;
}

export function getPrimaryImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  const primary = images.find((img) => img && img.is_primary);
  return getImageUrl(primary || images[0]);
}
