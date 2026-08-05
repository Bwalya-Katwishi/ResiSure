import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { Shield, Search, CheckCircle, ArrowRight, Star, AlertTriangle } from 'lucide-react';

export default function HomePage() {
  return (
    <Layout>
      {/* Hero */}
      <div className="text-center py-16 md:py-24 page-enter">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full mb-8 border border-blue-100">
          <Shield size={12} />
          Zambia's first escrow-protected student housing platform
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
          Find Student Housing<br />
          <span className="text-blue-600">Without the Scams</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          ResiSure holds your payment in escrow until you confirm your move-in.
          No more losing money to fake listings.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <Link href="/properties" className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-base flex items-center justify-center gap-2 shadow-sm">
            Browse Listings <ArrowRight size={18} />
          </Link>
          <Link href="/auth/register" className="w-full sm:w-auto bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-colors text-base text-center">
            Create Free Account
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
          {['No upfront risk', 'Verified landlords', 'Escrow protected', 'Free to join'].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-green-500" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Problem banner */}
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 md:p-8 mb-16">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-red-900 text-lg mb-2">The Problem We're Solving</h2>
            <p className="text-red-700 text-sm leading-relaxed">
              Over 80% of UNZA's 28,000+ students need off-campus housing. Scammers exploit this demand
              by posting fake listings, collecting mobile money payments, and disappearing.
              Existing platforms verify listings but don't protect payments — leaving students vulnerable.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {[
          { value: '28,000+', label: 'UNZA Students', sub: 'needing housing' },
          { value: '80%', label: 'Off-Campus', sub: 'forced into risky markets' },
          { value: '4,150', label: 'On-Campus Beds', sub: 'severely limited' },
          { value: '100%', label: 'Escrow Safe', sub: 'every transaction' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="text-2xl md:text-3xl font-bold text-blue-600 mb-1">{stat.value}</div>
            <div className="text-sm font-medium text-gray-900">{stat.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">How ResiSure Works</h2>
          <p className="text-gray-500">Three steps to safe, scam-free accommodation</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Search,
              step: '01',
              title: 'Browse Verified Listings',
              desc: 'Find accommodation from verified landlords near UNZA. Filter by price, area, and verification status.',
              color: 'bg-blue-50 text-blue-600',
            },
            {
              icon: Shield,
              step: '02',
              title: 'Pay into Escrow',
              desc: 'Your payment is held securely by ResiSure. The landlord receives nothing until you confirm move-in.',
              color: 'bg-green-50 text-green-600',
            },
            {
              icon: CheckCircle,
              step: '03',
              title: 'Confirm and Move In',
              desc: 'Once you verify the property matches its listing, funds release to the landlord. Dispute if it doesn\'t.',
              color: 'bg-purple-50 text-purple-600',
            },
          ].map((step, i) => (
            <div key={i} className="relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="absolute -top-3 left-5 bg-gray-900 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                {step.step}
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${step.color}`}>
                <step.icon size={24} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 text-lg">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonial placeholder */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-16">
        <div className="flex items-center gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
          ))}
        </div>
        <p className="text-gray-700 text-lg leading-relaxed mb-4">
          "ResiSure gave me peace of mind when looking for accommodation near UNZA.
          Knowing my payment was protected until I confirmed move-in made all the difference."
        </p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-bold text-sm">BK</span>
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">Bwalya K.</p>
            <p className="text-gray-400 text-xs">2nd Year Student, UNZA</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-10 md:p-14 text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">Ready to find safe housing?</h2>
        <p className="text-blue-100 mb-8 text-lg max-w-xl mx-auto">
          Join students across Lusaka who book accommodation with confidence using ResiSure.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/auth/register" className="w-full sm:w-auto bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors inline-flex items-center justify-center gap-2">
            Create Free Account <ArrowRight size={18} />
          </Link>
          <Link href="/properties" className="w-full sm:w-auto bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-400 transition-colors text-center border border-blue-400">
            Browse Listings
          </Link>
        </div>
      </div>
    </Layout>
  );
}