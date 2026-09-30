import { X, MapPin, CheckCircle } from 'lucide-react';
import { ACCOMMODATION_OPTIONS } from '../../../lib/propertyAccommodation';

export default function LandlordListingForm({
  showForm,
  editingId,
  formPanelRef,
  form,
  setForm,
  submitting,
  handleCreateProperty,
  setShowForm,
  locating,
  handleUseCurrentLocation,
}) {
  if (!showForm) return null;

  return (
    <div
      id="landlord-listing-form"
      ref={formPanelRef}
      className="mb-8 scroll-mt-24 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit listing' : 'Add new listing'}</h2>
        <button type="button" onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close listing form">
          <X size={20} />
        </button>
      </div>
      <form onSubmit={handleCreateProperty} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label" htmlFor="listing-title">Property title</label>
          <input id="listing-title" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" placeholder="e.g. Spacious Self-Contained Room in Chelstone" required />
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="listing-description">Description</label>
          <textarea id="listing-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" placeholder="Describe the property, amenities included, nearby facilities..." rows={3} />
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="listing-address">Full address</label>
          <input id="listing-address" type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" placeholder="Plot 45, Chilimbulu Road, Chelstone" required />
        </div>
        <div className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <label className="label mb-1">Live location</label>
          <p className="mb-3 text-xs text-slate-600">Pin the exact property location. Students only see this after they pay and choose a move-in date.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={handleUseCurrentLocation} disabled={locating} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50">
              <MapPin size={14} />
              {locating ? 'Getting location…' : 'Use my current location'}
            </button>
            {form.latitude != null && form.longitude != null && (
              <span className="break-all text-xs font-medium text-green-700">Location set ({Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)})</span>
            )}
            {(form.latitude != null || form.longitude != null) && (
              <button type="button" onClick={() => setForm({ ...form, latitude: null, longitude: null })} className="text-xs font-medium text-slate-500 hover:text-slate-800">Clear location</button>
            )}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="listing-area">Area / neighbourhood</label>
          <input id="listing-area" type="text" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="input" placeholder="e.g. Chelstone" required />
        </div>
        <div>
          <label className="label" htmlFor="listing-rent">Monthly rent (K)</label>
          <input id="listing-rent" type="number" value={form.rent_per_month} onChange={(e) => setForm({ ...form, rent_per_month: e.target.value })} className="input" placeholder="1500" required />
        </div>
        <div>
          <label className="label" htmlFor="listing-rooms">Number of rooms</label>
          <input id="listing-rooms" type="number" value={form.total_rooms} onChange={(e) => setForm({ ...form, total_rooms: e.target.value })} className="input" min="1" required />
        </div>
        <div>
          <label className="label" htmlFor="listing-type">Property type</label>
          <select id="listing-type" value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })} className="input">
            <option value="room">Room</option>
            <option value="shared">Shared</option>
            <option value="studio">Studio</option>
            <option value="apartment">Apartment</option>
          </select>
        </div>
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <label className="label" htmlFor="listing-accommodation-gender">
            Who is this listing for? <span className="text-red-600">*</span>
          </label>
          <p className="mb-3 text-xs text-slate-600">
            Students use this to find suitable accommodation. If the property welcomes both female and male students, say how many rooms are for each.
          </p>
          <select
            id="listing-accommodation-gender"
            value={form.accommodation_gender}
            onChange={(e) => setForm({
              ...form,
              accommodation_gender: e.target.value,
              female_rooms_available: '',
              male_rooms_available: '',
            })}
            className="input max-w-md"
            required
          >
            <option value="">Select…</option>
            {ACCOMMODATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {form.accommodation_gender === 'both' && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="listing-female-rooms">Rooms for female students</label>
                <input
                  id="listing-female-rooms"
                  type="number"
                  min="0"
                  value={form.female_rooms_available}
                  onChange={(e) => setForm({ ...form, female_rooms_available: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="listing-male-rooms">Rooms for male students</label>
                <input
                  id="listing-male-rooms"
                  type="number"
                  min="0"
                  value={form.male_rooms_available}
                  onChange={(e) => setForm({ ...form, male_rooms_available: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <p className="sm:col-span-2 text-xs text-slate-500">
                These two numbers must add up to the total number of rooms ({form.total_rooms || '—'}).
              </p>
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <span className="label">Amenities</span>
          <div className="flex flex-wrap gap-2">
            {['wifi', 'water', 'electricity', 'security', 'furnished', 'kitchen'].map((item) => (
              <label key={item} className="cursor-pointer rounded-full border px-3 py-1.5 text-xs">
                <input type="checkbox" className="mr-1" checked={form.amenities.includes(item)} onChange={(e) => setForm({ ...form, amenities: e.target.checked ? [...form.amenities, item] : form.amenities.filter((value) => value !== item) })} />
                {item}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row md:col-span-2">
          <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
            {submitting ? (editingId ? 'Saving…' : 'Publishing…') : (<><CheckCircle size={14} /> {editingId ? 'Save changes' : 'Create listing'}</>)}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="btn-secondary w-full sm:w-auto">Cancel</button>
        </div>
      </form>
    </div>
  );
}
