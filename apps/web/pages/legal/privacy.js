import Link from 'next/link';
import Layout from '../../components/layout/Layout';

export default function PrivacyPage() {
  return (
    <Layout>
      <div className="mx-auto max-w-3xl py-4">
        <Link href="/" className="text-sm text-blue-700 hover:underline">← Back</Link>
        <h1 className="page-heading mb-2 mt-4">Privacy Policy</h1>
        <p className="page-subheading mb-6 sm:mb-8">How ResiSure handles personal information.</p>
        <div className="card space-y-4 p-4 text-sm leading-relaxed text-slate-700 sm:p-6">
          <p>
            ResiSure processes personal information in accordance with the <strong>Zambia Data Protection Act, 2021</strong>.
            This policy describes what we collect, why we collect it, and how long we keep it. It is not legal advice.
          </p>

          <h2 className="text-base font-semibold text-slate-900">Information we collect</h2>
          <p>
            We store your name, email, phone number, role, booking history, and — where you provide them —
            identity verification documents (such as NRC and, for students, a university confirmation slip;
            for landlords, proof of property interest). Passwords are stored securely and are never shown back to you.
          </p>
          <p>
            Phone numbers used during payment are kept with the booking record so payment status can be reconciled.
          </p>

          <h2 className="text-base font-semibold text-slate-900">Identity documents</h2>
          <p>We apply the following principles to verification documents:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Collected only when necessary for identity or listing verification.</li>
            <li>Used only for the stated verification and trust-and-safety purpose.</li>
            <li>Stored securely and accessible only to authorised administrators and the document owner.</li>
            <li>Retained only for as long as needed for verification, dispute resolution, or legal obligations, then deleted or anonymised.</li>
            <li>Shared with third-party processors (such as cloud storage or messaging providers) only where required to operate the service and subject to appropriate data-processing arrangements where applicable.</li>
          </ul>

          <h2 className="text-base font-semibold text-slate-900">How we use your information</h2>
          <p>
            We use this information to operate bookings, escrow-style protected payments, notifications,
            fraud prevention, and administrator review. By creating an account and accepting these terms,
            you consent to this processing for the purposes described.
          </p>

          <h2 className="text-base font-semibold text-slate-900">Your rights</h2>
          <p>
            Under the Zambia Data Protection Act, 2021, you may have rights to access, correct, or request
            deletion of your personal information, subject to legal and operational requirements. Contact
            support to exercise these rights.
          </p>
        </div>
      </div>
    </Layout>
  );
}
