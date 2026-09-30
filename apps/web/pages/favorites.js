import { useEffect, useState } from 'react';
import Head from 'next/head';
import { Heart } from 'lucide-react';
import Layout from '../components/layout/Layout';
import StatusBanner from '../components/ui/StatusBanner';
import PropertyCard from '../components/properties/PropertyCard';
import EmptyState from '../components/ui/EmptyState';
import { PropertyCardSkeleton } from '../components/ui/Skeleton';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { getFavorites } from '../lib/api';

export default function FavoritesPage() {
  const { authorized } = useRequireAuth({ role: 'student' });
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const load = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await getFavorites();
      setProperties(res.data.data.properties || []);
    } catch (err) {
      setFetchError('We could not load your saved rooms. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) load();
  }, [authorized]);

  return (
    <Layout>
      <Head>
        <title>Saved rooms — ResiSure</title>
      </Head>
      <div className="mb-6 sm:mb-8">
        <h1 className="page-heading mb-2">Saved rooms</h1>
        <p className="page-subheading">Rooms you saved while browsing verified accommodation.</p>
      </div>

      {fetchError && (
        <StatusBanner type="error" title="Could not load saved rooms" className="mb-6">
          {fetchError}
          <button type="button" onClick={load} className="mt-2 text-sm font-semibold underline">
            Try again
          </button>
        </StatusBanner>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((key) => <PropertyCardSkeleton key={key} />)}
        </div>
      ) : properties.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No saved properties yet."
          body="Save accommodation you're interested in and they'll appear here."
          actionHref="/properties"
          actionLabel="Browse rooms"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onFavoriteChange={(id, saved) => {
                if (!saved) setProperties((current) => current.filter((item) => item.id !== id));
              }}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}
