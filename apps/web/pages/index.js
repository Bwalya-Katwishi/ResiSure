import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { Shield, Search, CheckCircle, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <Layout>
      {/* Hero */}
      <div className="text-center py-20">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-sm font-medium px-4 py-2 rounded-full mb-6">
          <Shield size={14} />
          <span>Zambia's first escrow-protected student housing platform</span>
        </div>

        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Find Student Housing<br />
          <span className="text-blue-600">Without the Scams</span>
        </h1>

        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          ResiSure holds your payment in escrow until you confirm your move-in.
          Your money is safe — always.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/properties" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-lg flex items-center gap-2">
            Browse Listings <ArrowRight size={18} />
          </Link>
          <Link href="/auth/register" className="bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold border border-gray-200 hover:border-blue-300 transition-colors text-lg">
            Get Started Free
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 py-10 border-y border-gray-100 mb-16">
        {[
          { value: '28,000+', label: 'UNZA Students' },
          { value: '80%', label: 'Need Off-Campus Housing' },
          { value: '100%', label: 'Escrow Protected' },
        ].map((stat, i) => (
          <div key={i} className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="py-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
          How ResiSure Works
        </h2>
        <p className="text-center text-gray-500 mb-12">Three simple steps to safe accommodation</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Search,
              step: '01',
              title: 'Browse Verified Listings',
              desc: 'Find accommodation from verified landlords near UNZA and other universities across Lusaka.',
            },
            {
              icon: Shield,
              step: '02',
              title: 'Pay into Escrow',
              desc: 'Your payment is held securely by ResiSure. The landlord receives nothing until you confirm move-in.',
            },
            {
              icon: CheckCircle,
              step: '03',
              title: 'Confirm and Move In',
              desc: 'Once you confirm the property matches its listing, funds are released to the landlord. Dispute if it does not.',
            },
          ].map((step, i) => (
            <div key={i} className="relative text-center p-8 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
              <div className="absolute -top-3 left-6 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-md">
                {step.step}
              </div>
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <step.icon size={28} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-3 text-lg">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-16 bg-blue-600 rounded-2xl p-12 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to find safe housing?</h2>
        <p className="text-blue-100 mb-8 text-lg">Join thousands of UNZA students who book with confidence.</p>
        <Link href="/auth/register" className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors inline-flex items-center gap-2">
          Create Free Account <ArrowRight size={18} />
        </Link>
      </div>
    </Layout>
  );
}