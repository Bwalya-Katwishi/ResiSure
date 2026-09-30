import Link from 'next/link';
import Layout from '../../components/layout/Layout';

export default function TermsPage() {
  return (
    <Layout>
      <div className="mx-auto max-w-3xl py-4">
        <Link href="/" className="text-sm text-blue-700 hover:underline">← Back</Link>
        <h1 className="page-heading mb-2 mt-4">Terms of Use</h1>
        <p className="page-subheading mb-6 sm:mb-8">How ResiSure bookings and payment protection work.</p>
        <div className="card space-y-4 p-4 text-sm leading-relaxed text-slate-700 sm:p-6">
          <p>
            ResiSure helps students find verified accommodation around UNZA and Lusaka, and helps landlords
            list rooms with payment protection. By creating an account you agree to use the platform lawfully
            and honestly.
          </p>

          <h2 className="text-base font-semibold text-slate-900">Payment protection</h2>
          <p>
            ResiSure uses an escrow-style protected payment workflow that holds accommodation payments
            pending student move-in confirmation. ResiSure is not a financial institution and does not
            independently hold customer funds. Payments are collected through the configured mobile-money
            provider (MTN MoMo or Airtel Money, or a demonstration provider in non-production environments).
          </p>
          <p>
            After a landlord accepts your booking, you pay through the platform. The payment remains
            protected until you confirm move-in or the process below applies. ResiSure reduces risk; it
            cannot guarantee that no problem will ever occur.
          </p>

          <h2 className="text-base font-semibold text-slate-900">Move-in confirmation and 72-hour window</h2>
          <p>
            When your scheduled move-in date arrives, a move-in confirmation window opens. During this
            window you should inspect the room and either:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Confirm move-in</strong> — funds are released to the landlord according to the payment workflow.</li>
            <li><strong>Raise a dispute</strong> — funds remain frozen pending admin review.</li>
            <li><strong>Take no action</strong> — if 72 hours pass from when the window opens and no dispute is active, funds may be automatically released unless there is an unresolved payment or system issue.</li>
          </ul>
          <p>
            Automatic release does not occur while a dispute is open or while a payment is still pending
            confirmation from the payment provider.
          </p>

          <h2 className="text-base font-semibold text-slate-900">Verification and listings</h2>
          <p>
            Landlords may list properties and submit verification documents for manual review. Students may
            browse verified listings, book, pay, confirm move-in, raise disputes, or report suspicious
            content. Only verified listings are available for booking.
          </p>

          <h2 className="text-base font-semibold text-slate-900">Account conduct</h2>
          <p>
            Accounts that misuse the service, submit fraudulent documents, or attempt to pay outside the
            platform may be suspended. These terms may be updated as the platform evolves.
          </p>
        </div>
      </div>
    </Layout>
  );
}
