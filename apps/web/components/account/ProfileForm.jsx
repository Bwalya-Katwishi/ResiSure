import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { updateMe, uploadProfilePhoto } from '../../lib/api';
import { getImageUrl } from '../../lib/images';
import { Camera } from 'lucide-react';

export default function ProfileForm({ showPhoto = false, sectionId = 'profile-section' }) {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateMe({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
      });
      setUser({ ...user, ...res.data.data.user });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'We could not update your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Use a JPG, PNG or WebP photo');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await uploadProfilePhoto(formData);
      setUser({ ...user, ...res.data.data.user });
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not upload photo');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const photoUrl = user?.profile_photo_url ? getImageUrl(user.profile_photo_url) : null;

  return (
    <form id={sectionId} onSubmit={handleSubmit} className="card mb-8 scroll-mt-24 p-5">
      <h2 className="mb-4 font-semibold text-slate-900">Your profile</h2>

      {showPhoto && (
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative h-20 w-20 overflow-hidden rounded-full bg-slate-100">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-400">
                {user?.full_name?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <div>
            <input
              ref={photoInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handlePhotoChange}
              className="hidden"
              id="profile-photo"
            />
            <label
              htmlFor="profile-photo"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Camera size={14} />
              {uploadingPhoto ? 'Uploading…' : 'Upload photo'}
            </label>
            <p className="mt-1 text-xs text-slate-400">JPG, PNG or WebP · max 5MB</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label" htmlFor="profile-name">Full name</label>
          <input
            id="profile-name"
            type="text"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="profile-phone">Phone number</label>
          <input
            id="profile-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input"
            placeholder="0971234567"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-1 lg:flex lg:items-end">
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Updating…' : 'Update profile'}
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">{user?.email}</p>
    </form>
  );
}
