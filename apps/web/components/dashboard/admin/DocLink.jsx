export default function DocLink({ label, url, onOpen }) {
  if (!url) {
    return <p className="text-sm text-amber-700">{label}: not uploaded</p>;
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(url, label)}
      className="block text-sm font-medium text-blue-700 hover:underline"
    >
      View {label}
    </button>
  );
}
