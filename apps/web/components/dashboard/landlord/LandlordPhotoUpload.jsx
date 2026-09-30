import { X, Upload, Trash2 } from 'lucide-react';
import { getImageUrl, getImageId } from '../../../lib/images';

export default function LandlordPhotoUpload({
  selectedProperty,
  photosPanelRef,
  fileInputRef,
  previewImages,
  setPreviewImages,
  handleFileSelect,
  handleImageUpload,
  handleDeleteImage,
  uploadingImages,
  setSelectedProperty,
}) {
  if (!selectedProperty) return null;

  return (
    <div id="landlord-photos" ref={photosPanelRef} className="mb-8 scroll-mt-24 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Upload photos</h2>
          <p className="mt-0.5 text-sm text-gray-500">{selectedProperty.title} — up to 5 photos</p>
        </div>
        <button type="button" onClick={() => { setSelectedProperty(null); setPreviewImages([]); }} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close photo upload">
          <X size={20} />
        </button>
      </div>
      {Array.isArray(selectedProperty.images) && selectedProperty.images.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-gray-500">Current photos</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {selectedProperty.images.map((img, i) => (
              <div key={getImageId(img) || i} className="group relative h-24 overflow-hidden rounded-lg">
                <img src={getImageUrl(img)} alt="" className="h-full w-full object-cover" />
                {(img.is_primary || i === 0) && <span className="absolute left-1 top-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-xs text-white">Main</span>}
                <button type="button" onClick={() => handleDeleteImage(img)} className="absolute right-1 top-1 rounded-full bg-red-500 p-1.5 text-white opacity-100 transition-opacity hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100" title="Delete photo" aria-label="Delete photo">
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()} onClick={() => fileInputRef.current?.click()} className="cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50">
        <Upload size={28} className="mx-auto mb-2 text-gray-400" />
        <p className="text-sm font-medium text-gray-600">Click to select photos</p>
        <p className="mt-1 text-xs text-gray-400">JPG, PNG or WebP — max 5MB each</p>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
      </div>
      {previewImages.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-gray-500">Ready to upload ({previewImages.length})</p>
          <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {previewImages.map((p, i) => (
              <div key={i} className="relative h-24 overflow-hidden rounded-lg">
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={(e) => { e.stopPropagation(); setPreviewImages(previewImages.filter((_, idx) => idx !== i)); }} className="absolute right-1 top-1 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={handleImageUpload} disabled={uploadingImages} className="btn-primary w-full sm:w-auto">
            <Upload size={14} />
            {uploadingImages ? 'Uploading…' : `Upload ${previewImages.length} photo${previewImages.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
