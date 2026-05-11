import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import PropertyCard from '../../components/properties/PropertyCard';
import { getProperties } from '../../lib/api';
import { Search, SlidersHorizontal, Home } from 'lucide-react';

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    area: '', min_price: '', max_price: '', verified: ''
  });

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const res = await getProperties(activeFilters);
      setProperties(res.data.data.properties);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProperties(); }, []);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Accommodation</h1>
        <p className="text-gray-500">All listings are escrow-protected — your payment is safe</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal size={16} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Filter listings</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Area (e.g. Chelstone)"
            value={filters.area}
            onChange={e => setFilters({ ...filters, area: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Min price (ZMW)"
            value={filters.min_price}
            onChange={e => setFilters({ ...filters, min_price: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Max price (ZMW)"
            value={filters.max_price}
            onChange={e => setFilters({ ...filters, max_price: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filters.verified}
            onChange={e => setFilters({ ...filters, verified: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All landlords</option>
            <option value="true">Verified only</option>
          </select>
        </div>
        <button
          onClick={fetchProperties}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Search size={14} />
          Search
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading listings...</p>
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-20">
          <Home size={40} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No properties found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-500 mb-4">{properties.length} listing(s) found</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(p => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}