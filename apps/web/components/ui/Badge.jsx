export default function Badge({ type = 'default', children }) {
  const styles = {
    verified: 'bg-green-100 text-green-700 border border-green-200',
    pending: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    rejected: 'bg-red-100 text-red-700 border border-red-200',
    escrow: 'bg-blue-100 text-blue-700 border border-blue-200',
    completed: 'bg-green-100 text-green-700 border border-green-200',
    disputed: 'bg-orange-100 text-orange-700 border border-orange-200',
    default: 'bg-gray-100 text-gray-700 border border-gray-200',
  };

  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${styles[type] || styles.default}`}>
      {children}
    </span>
  );
}