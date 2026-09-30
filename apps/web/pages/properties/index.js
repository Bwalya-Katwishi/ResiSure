import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import StatusBanner from '../../components/ui/StatusBanner';
import PropertyCard from '../../components/properties/PropertyCard';
import EmptyState from '../../components/ui/EmptyState';
import { PropertyCardSkeleton } from '../../components/ui/Skeleton';
import { getProperties } from '../../lib/api';
import { Search, SlidersHorizontal, Home } from 'lucide-react';
import { ACCOMMODATION_OPTIONS } from '../../lib/propertyAccommodation';

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    area: '', min_price: '', max_price: '', verified: '', available: '',
    property_type: '', amenities: [], sort: 'recommended', page: 1, for_gender: '',
  });

  const defaultFilters = {
    area: '', min_price: '', max_price: '', verified: '', available: '',
    property_type: '', amenities: [], sort: 'recommended', page: 1, for_gender: '',
  };

  const fetchProperties = async (override = {}, source = filters) => {
    setLoading(true);
    setFetchError('');
    try {
      const next = { ...source, ...override };
      const activeFilters = Object.fromEntries(
        Object.entries(next).filter(([key, v]) => {
          if (key === 'amenities') return Array.isArray(v) && v.length > 0;
          return v !== '' && v !== undefined;
        }).map(([key, v]) => [key, key === 'amenities' ? v.join(',') : v])
      );
      const res = await getProperties(activeFilters);
      setProperties(res.data.data.properties);
      if (res.data.pagination) setPagination(res.data.pagination);
    } catch (err) {
      setFetchError('We could not load listings. Please check your connection and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    fetchProperties({}, defaultFilters);
  };

  useEffect(() => {
    if (!router.isReady) return;
    const next = {
      ...filters,
      area: router.query.area || '',
      max_price: router.query.max_price || '',
      property_type: router.query.property_type || '',
      verified: router.query.verified || '',
      sort: router.query.verified === 'true' ? 'recommended' : filters.sort,
      page: 1,
    };
    setFilters(next);
    fetchProperties({}, next);
  }, [router.isReady, router.query.area, router.query.max_price, router.query.property_type, router.query.verified]);

  const activeFilterCount = [
    filters.area,
    filters.min_price,
    filters.max_price,
    filters.verified,
    filters.available,
    filters.property_type,
    filters.for_gender,
    filters.amenities.length > 0 ? 'amenities' : '',
  ].filter(Boolean).length;

  return (
    <Layout>
      <Head>
        <title>Browse rooms — ResiSure</title>
      </Head>
      <div className="mb-6 sm:mb-8">
        <h1 className="page-heading">Browse rooms</h1>
        <p className="page-subheading mt-1">Find student accommodation around UNZA and Lusaka. Verified and unverified listings are shown — check each listing&apos;s status.</p>
      </div>

      <div className="card mb-6 p-4 sm:mb-8 sm:p-5">
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 md:pointer-events-none md:cursor-default"
          aria-expanded={filtersOpen}
          aria-controls="property-filters"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Filter listings</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {activeFilterCount} active
              </span>
            )}
          </div>
          <span className="text-sm font-medium text-blue-700 md:hidden">
            {filtersOpen ? 'Hide' : 'Show'}
          </span>
        </button>

        <div id="property-filters" className={`${filtersOpen ? 'mt-4 block' : 'hidden'} md:mt-4 md:block`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div>
            <label className="label" htmlFor="area">Area</label>
            <input id="area" className="input" placeholder="e.g. Chelstone" value={filters.area} onChange={e => setFilters({ ...filters, area: e.target.value, page: 1 })} />
          </div>
          <div>
            <label className="label" htmlFor="min">Min price</label>
            <input id="min" type="number" className="input" placeholder="K" value={filters.min_price} onChange={e => setFilters({ ...filters, min_price: e.target.value, page: 1 })} />
          </div>
          <div>
            <label className="label" htmlFor="max">Max price</label>
            <input id="max" type="number" className="input" placeholder="K" value={filters.max_price} onChange={e => setFilters({ ...filters, max_price: e.target.value, page: 1 })} />
          </div>
          <div>
            <label className="label" htmlFor="type">Type</label>
            <select id="type" className="input" value={filters.property_type} onChange={e => setFilters({ ...filters, property_type: e.target.value, page: 1 })}>
              <option value="">All types</option>
              <option value="room">Room</option>
              <option value="shared">Shared</option>
              <option value="studio">Studio</option>
              <option value="apartment">Apartment</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="avail">Availability</label>
            <select id="avail" className="input" value={filters.available} onChange={e => setFilters({ ...filters, available: e.target.value, page: 1 })}>
              <option value="">Any availability</option>
              <option value="true">Available only</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="verified">Verification</label>
            <select id="verified" className="input" value={filters.verified} onChange={e => setFilters({ ...filters, verified: e.target.value, page: 1 })}>
              <option value="">All listings</option>
              <option value="true">Verified landlords only</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="for-gender">Suitable for</label>
            <select id="for-gender" className="input" value={filters.for_gender} onChange={e => setFilters({ ...filters, for_gender: e.target.value, page: 1 })}>
              <option value="">Any student</option>
              {ACCOMMODATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="sort">Sort</label>
            <select id="sort" className="input" value={filters.sort} onChange={e => setFilters({ ...filters, sort: e.target.value })}>
              <option value="recommended">Recommended</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['wifi', 'water', 'electricity', 'security', 'furnished', 'kitchen'].map((item) => (
            <label key={item} className="cursor-pointer rounded-full border border-slate-200 px-3 py-1.5 text-xs capitalize text-slate-600">
              <input
                type="checkbox"
                className="mr-1"
                checked={filters.amenities.includes(item)}
                onChange={(e) => {
                  const amenities = e.target.checked
                    ? [...filters.amenities, item]
                    : filters.amenities.filter((value) => value !== item);
                  setFilters({ ...filters, amenities, page: 1 });
                }}
              />
              {item}
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => fetchProperties()} disabled={loading} className="btn-primary w-full sm:w-auto">
            <Search size={14} aria-hidden="true" />
            {loading ? 'Searching…' : 'Search rooms'}
          </button>
          {activeFilterCount > 0 && (
            <button type="button" onClick={clearFilters} className="btn-secondary w-full sm:w-auto">
              Clear filters
            </button>
          )}
        </div>
        </div>
      </div>

      {fetchError && (
        <StatusBanner type="error" title="Could not load listings" className="mb-6">
          {fetchError}
          <button type="button" onClick={() => fetchProperties()} className="mt-2 text-sm font-semibold underline">
            Try again
          </button>
        </StatusBanner>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((key) => <PropertyCardSkeleton key={key} />)}
        </div>
      ) : properties.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No properties match your current search and filters."
          body="Try a different area, budget, or property type."
          onAction={clearFilters}
          actionLabel="Clear filters"
        />
      ) : (
        <div>
          <p className="mb-4 text-sm text-slate-500">{pagination.total || properties.length} room(s)</p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
          {pagination.total_pages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                aria-label="Previous page"
                onClick={() => {
                  const page = pagination.page - 1;
                  setFilters({ ...filters, page });
                  fetchProperties({ page });
                }}
                className="btn-secondary"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500" aria-live="polite">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.total_pages || loading}
                aria-label="Next page"
                onClick={() => {
                  const page = pagination.page + 1;
                  setFilters({ ...filters, page });
                  fetchProperties({ page });
                }}
                className="btn-secondary"
              >
                Next
              </button>
            </nav>
          )}
        </div>
      )}
    </Layout>
  );
}
