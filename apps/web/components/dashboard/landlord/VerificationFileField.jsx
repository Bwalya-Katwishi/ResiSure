import { formatDocSize, validateVerificationFile } from '../../../lib/verificationUpload';

export { validateVerificationFile };

export default function VerificationFileField({
  id,
  label,
  required = true,
  file,
  error,
  onSelect,
  disabled,
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
        {required ? ' (required)' : ''}
      </label>
      <input
        id={id}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        disabled={disabled}
        onChange={(e) => onSelect(e.target.files?.[0] || null)}
        className={`input ${error ? 'border-red-300 ring-1 ring-red-200' : ''}`}
      />
      {file && !error && (
        <p className="mt-1 truncate text-xs text-green-700">
          Selected: {file.name} ({formatDocSize(file.size)})
        </p>
      )}
      {!file && !error && (
        <p className="mt-1 text-xs text-slate-400">JPG, PNG, WebP or PDF — max 8MB</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}
