import Link from 'next/link';
import Logo from '../brand/Logo';

export default function Footer() {

  return (

    <footer className="mt-10 border-t border-slate-200 bg-white sm:mt-16">

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:py-10 md:grid-cols-3">

        <div>

          <Logo size="sm" href="/" className="mb-3" />

          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">

            Verified student accommodation with payment protection.

          </p>

        </div>

        <nav aria-label="Explore">

          <p className="mb-3 text-sm font-semibold text-slate-900">Explore</p>

          <div className="space-y-2 text-sm text-slate-600">

            <Link href="/properties" className="block hover:text-blue-700">Browse rooms</Link>

            <Link href="/#how-it-works" className="block hover:text-blue-700">How it works</Link>

            <Link href="/#for-landlords" className="block hover:text-blue-700">For landlords</Link>

          </div>

        </nav>

        <nav aria-label="Legal">

          <p className="mb-3 text-sm font-semibold text-slate-900">Legal</p>

          <div className="space-y-2 text-sm text-slate-600">

            <Link href="/legal/terms" className="block hover:text-blue-700">Terms</Link>

            <Link href="/legal/privacy" className="block hover:text-blue-700">Privacy</Link>

          </div>

        </nav>

      </div>

    </footer>

  );

}

