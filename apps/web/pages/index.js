import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { ArrowRight, BadgeCheck, Search, ShieldCheck, Scale } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState({ area: '', max_price: '', property_type: '' });

  const submitSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.area) params.set('area', search.area);
    if (search.max_price) params.set('max_price', search.max_price);
    if (search.property_type) params.set('property_type', search.property_type);
    router.push(`/properties${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <Layout>
      <Head>
        <title>ResiSure — Verified student accommodation</title>
      </Head>
      <section className="rounded-2xl border border-brand-100 bg-gradient-to-br from-white via-white to-brand-50 px-5 py-10 shadow-card sm:rounded-3xl sm:px-6 sm:py-12 md:px-12 md:py-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-primary sm:text-sm">Student housing around UNZA and Lusaka</p>
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          Find a room you can trust.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
          Discover verified student accommodation around UNZA and Lusaka. Book with confidence, with your payment protected until you confirm your move-in.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/properties" className="btn-primary px-6 py-3">
            Browse verified rooms
          </Link>
          <Link href="/auth/register?role=landlord" className="btn-secondary px-6 py-3">
            List your property
          </Link>
        </div>

        <form onSubmit={submitSearch} className="mt-10 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
          <div>
            <label className="label" htmlFor="area">Where are you looking?</label>
            <input
              id="area"
              className="input"
              placeholder="UNZA, Roma, Chelstone"
              value={search.area}
              onChange={(e) => setSearch({ ...search, area: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="budget">Price range</label>
            <select
              id="budget"
              className="input"
              value={search.max_price}
              onChange={(e) => setSearch({ ...search, max_price: e.target.value })}
            >
              <option value="">Any budget</option>
              <option value="1500">Up to K1,500</option>
              <option value="2500">Up to K2,500</option>
              <option value="4000">Up to K4,000</option>
              <option value="6000">Up to K6,000</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="type">Property type</label>
            <select
              id="type"
              className="input"
              value={search.property_type}
              onChange={(e) => setSearch({ ...search, property_type: e.target.value })}
            >
              <option value="">Any type</option>
              <option value="room">Room</option>
              <option value="shared">Shared</option>
              <option value="apartment">Apartment</option>
              <option value="studio">Studio</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full py-2.5">
              <Search size={16} />
              Search rooms
            </button>
          </div>
        </form>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          { icon: BadgeCheck, title: 'Verified rooms', copy: 'Listings are reviewed before they are available for student booking.' },
          { icon: ShieldCheck, title: 'Payment protection', copy: 'Escrow-style protected payments stay held pending your move-in confirmation.' },
          { icon: Scale, title: 'Dispute protection', copy: 'If something isn’t right, the payment can be held while the issue is reviewed.' },
        ].map((item) => (
          <div key={item.title} className="card p-5 sm:p-6">
            <item.icon className="mb-4 text-blue-600" size={22} />
            <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.copy}</p>
          </div>
        ))}
      </section>

      <section id="how-it-works" className="mt-16 scroll-mt-24">
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">How ResiSure works</h2>
        <p className="mt-2 text-slate-500">Four simple steps from search to move-in.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ['01', 'Find a room', 'Browse accommodation that fits your location and budget.'],
            ['02', 'Book securely', 'Make your payment through the available payment options. Your payment is held while your booking is being completed.'],
            ['03', 'Move in', 'Check the accommodation and confirm your move-in.'],
            ['04', 'Landlord gets paid', 'Once the required confirmation is complete, the payment is released to the landlord.'],
          ].map(([step, title, copy]) => (
            <div key={step} className="card p-5">
              <p className="text-sm font-semibold text-blue-600">{step}</p>
              <h3 className="mt-2 font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['28,000+', 'Students at UNZA'],
          ['4,150', 'On-campus beds'],
          ['Verified', 'Accommodation listings'],
          ['Protected', 'Booking payments'],
        ].map(([stat, label]) => (
          <div key={label} className="card p-5">
            <p className="text-2xl font-bold text-slate-900">{stat}</p>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </section>

      <section id="for-landlords" className="mt-12 scroll-mt-24 rounded-2xl bg-blue-600 px-5 py-10 text-white sm:mt-16 sm:rounded-3xl sm:px-8 sm:py-12 md:px-12">
        <h2 className="max-w-2xl text-2xl font-bold sm:text-3xl">List a room and get paid after move-in.</h2>
        <p className="mt-3 max-w-2xl text-blue-100">
          Students book with greater confidence when listings are reviewed and payments are protected. You receive payment after the student confirms move-in.
        </p>
        <Link href="/auth/register?role=landlord" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">
          List your property <ArrowRight size={16} />
        </Link>
      </section>
    </Layout>
  );
}
