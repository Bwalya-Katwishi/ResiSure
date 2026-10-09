const { parseCloudinaryUrl } = require('../src/utils/cloudinaryDoc');

describe('cloudinaryDoc', () => {
  test('parseCloudinaryUrl extracts public id and format', () => {
    const sample =
      'https://res.cloudinary.com/jaz0nafh/image/upload/v1790199077/resisure/verification/vp0vfrcgoultgpcwigtq.pdf';
    const parsed = parseCloudinaryUrl(sample);
    expect(parsed.publicId).toBe('resisure/verification/vp0vfrcgoultgpcwigtq');
    expect(parsed.format).toBe('pdf');
    expect(parsed.resourceType).toBe('image');
  });
});
