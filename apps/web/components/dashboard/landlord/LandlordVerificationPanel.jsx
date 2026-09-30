import Badge from '../../ui/Badge';

import StatusBanner from '../../ui/StatusBanner';

import { verificationLabel } from '../../../lib/bookingStatus';

import DocumentStatusRow from './DocumentStatusRow';
import VerificationDocLinks from '../VerificationDocLinks';
import { NRC_FORMAT_MESSAGE } from '@resisure/shared';

import VerificationFileField from './VerificationFileField';

import { FileText } from 'lucide-react';



export default function LandlordVerificationPanel({

  user,

  profile,

  verifyForm,

  setVerifyForm,

  verifyErrors,

  submittingVerify,

  uploadProgress,

  handleVerificationSubmit,

}) {

  const missingNrc = !verifyForm.nrc_document && !profile?.has_nrc_doc;

  const missingDeed = !verifyForm.land_document && !profile?.has_land_doc;

  const landlordDocLinks = [
    profile?.nrc_doc_url ? { label: 'NRC document', url: profile.nrc_doc_url } : null,
    (profile?.land_doc_url || profile?.verification_doc_url)
      ? { label: 'Title deed document', url: profile.land_doc_url || profile.verification_doc_url }
      : null,
  ].filter(Boolean);

  return (

    <section id="landlord-verification" className="card mb-8 scroll-mt-24 p-5">

      <div className="mb-4 flex items-start justify-between gap-4">

        <div>

          <h2 className="font-semibold text-slate-900">Verification documents</h2>

          <p className="mt-1 text-sm text-slate-500">

            Upload your NRC and title deed. Both documents are required. Once verified, you can publish listings and accept booking requests.

          </p>

        </div>

        <Badge type={user?.verification_status === 'verified' ? 'verified' : user?.verification_status === 'rejected' ? 'default' : 'pending'}>

          {verificationLabel(user?.verification_status || 'pending')}

        </Badge>

      </div>



      <div className="mb-4 space-y-2">

        <DocumentStatusRow

          label="NRC (required)"

          uploaded={profile?.has_nrc_doc || Boolean(verifyForm.nrc_document)}

          accountStatus={user?.verification_status}

        />

        <DocumentStatusRow

          label="Title deed / proof of ownership (required)"

          uploaded={profile?.has_land_doc || Boolean(verifyForm.land_document)}

          accountStatus={user?.verification_status}

        />

      </div>

      {landlordDocLinks.length > 0 && (
        <VerificationDocLinks docs={landlordDocLinks} className="mb-4" />
      )}

      {user?.verification_status === 'verified' ? (

        <StatusBanner type="success" title="Account verified">

          Your account has been verified. You can now post listings — they will be visible to students immediately and marked unverified until admin review.

        </StatusBanner>

      ) : (

        <>

          {user?.verification_status === 'rejected' && (

            <StatusBanner type="error" title="Verification rejected" className="mb-4">

              Your verification was not approved. Please upload new documents below for another review.

            </StatusBanner>

          )}

          {user?.verification_status !== 'verified' && user?.verification_status !== 'rejected' && (

            <StatusBanner type="warning" title="Verification required" className="mb-4">

              {profile?.has_nrc_doc && profile?.has_land_doc

                ? 'Your documents are under review. You cannot publish listings until an admin approves your account.'

                : 'Submit your NRC and title deed to unlock listing creation and booking acceptance.'}

            </StatusBanner>

          )}

          {(missingNrc || missingDeed) && (

            <StatusBanner type="warning" title="Missing documents" className="mb-4">

              {missingNrc && missingDeed

                ? 'Upload both your NRC and title deed before submitting.'

                : missingNrc

                  ? 'Your NRC document is still missing.'

                  : 'Your title deed document is still missing.'}

            </StatusBanner>

          )}

          <form onSubmit={handleVerificationSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">

            <div className="md:col-span-2">

              <label className="label" htmlFor="landlord-nrc-number">NRC number (required)</label>

              <input

                id="landlord-nrc-number"

                type="text"

                inputMode="numeric"

                value={verifyForm.nrc_number}

                onChange={(e) => setVerifyForm({ ...verifyForm, nrc_number: e.target.value })}

                className="input"

                placeholder="123456/78/1"

                pattern="\d{6}/\d{2}/\d{1}"

                title={NRC_FORMAT_MESSAGE}

                disabled={submittingVerify}

                required

              />
              {verifyErrors?.nrc_number && (
                <p className="mt-1 text-xs text-red-600">{verifyErrors.nrc_number}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">Format: 123456/78/1</p>

            </div>

            <VerificationFileField

              id="landlord-nrc-doc"

              label="NRC document"

              file={verifyForm.nrc_document}

              error={verifyErrors?.nrc_document}

              disabled={submittingVerify}

              onSelect={(file) => setVerifyForm({ ...verifyForm, nrc_document: file })}

            />

            <VerificationFileField

              id="landlord-land-doc"

              label="Title deed / proof of ownership"

              file={verifyForm.land_document}

              error={verifyErrors?.land_document}

              disabled={submittingVerify}

              onSelect={(file) => setVerifyForm({ ...verifyForm, land_document: file })}

            />

            {submittingVerify && uploadProgress > 0 && (

              <div className="md:col-span-2">

                <div className="mb-1 flex justify-between text-xs text-slate-500">

                  <span>Uploading documents…</span>

                  <span>{uploadProgress}%</span>

                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                  <div

                    className="h-full rounded-full bg-blue-600 transition-all duration-200"

                    style={{ width: `${uploadProgress}%` }}

                  />

                </div>

              </div>

            )}

            <button

              type="submit"

              disabled={submittingVerify}

              className="btn-primary md:col-span-2 disabled:opacity-60"

            >

              <FileText size={14} />

              {submittingVerify

                ? 'Uploading documents…'

                : user?.verification_status === 'rejected'

                  ? 'Re-submit documents'

                  : 'Submit for verification'}

            </button>

          </form>

        </>

      )}

    </section>

  );

}

