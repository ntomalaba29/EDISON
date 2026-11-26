import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, ShieldCheck, Tv } from 'lucide-react';
import { edisonFetch } from '../lib/csrfFetch';
import type { PublicUser } from '../types/edison';

type EnrollmentStatus = 'pending' | 'approved' | 'expired' | 'locked' | 'revoked';

interface TvEnrollment {
  enrollmentId: string;
  deviceLabel: string;
  status: EnrollmentStatus;
  expiresAt: string;
}

interface TvEnrollmentApprovalViewProps {
  currentUser: PublicUser;
  enrollmentId: string | null;
  pairingCode: string | null;
  allowManualFallback?: boolean;
}

export function TvEnrollmentApprovalView({
  currentUser,
  enrollmentId,
  pairingCode,
  allowManualFallback = false,
}: TvEnrollmentApprovalViewProps) {
  const [enrollment, setEnrollment] = useState<TvEnrollment | null>(null);
  const [activeEnrollmentId, setActiveEnrollmentId] = useState(enrollmentId);
  const [activePairingCode, setActivePairingCode] = useState(pairingCode ?? '');
  const [loading, setLoading] = useState(true);
  const [detailRequestId, setDetailRequestId] = useState(0);
  const [approving, setApproving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    let active = true;
    if (!activeEnrollmentId || currentUser.role !== 'household_viewer') {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setEnrollment(null);
    setError(null);
    void edisonFetch(`/api/tv/enrollment/${encodeURIComponent(activeEnrollmentId)}/approval-details`)
      .then(async (response) => {
        const data = (await response.json()) as {
          enrollment?: TvEnrollment;
          error?: string;
          message?: string;
        };
        if (!response.ok) {
          throw new Error(data.message || data.error || `Request failed (HTTP ${response.status}).`);
        }
        if (!data.enrollment) throw new Error('The enrollment details were missing from the response.');
        if (active) setEnrollment(data.enrollment);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Unable to load TV enrollment details.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeEnrollmentId, currentUser.role, detailRequestId]);

  const approve = async () => {
    if (!activeEnrollmentId || !activePairingCode || enrollment?.status !== 'pending') return;
    setApproving(true);
    setError(null);
    try {
      const response = await edisonFetch('/api/tv/enrollment/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: activeEnrollmentId, pairingCode: activePairingCode }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(data.message || data.error || `Approval failed (HTTP ${response.status}).`);
      }
      setEnrollment((current) => current ? { ...current, status: 'approved' } : current);
      setApproved(true);
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to approve this TV.');
    } finally {
      setApproving(false);
    }
  };

  const lookupPairingCode = async () => {
    if (!/^\d{8}$/.test(activePairingCode)) {
      setError('Enter the eight-digit code shown on the TV.');
      return;
    }
    setLookingUp(true);
    setError(null);
    try {
      const response = await edisonFetch('/api/tv/enrollment/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingCode: activePairingCode }),
      });
      const data = (await response.json()) as {
        enrollment?: { enrollmentId?: string };
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(data.message || data.error || `TV lookup failed (HTTP ${response.status}).`);
      }
      if (!data.enrollment?.enrollmentId) {
        throw new Error('The active TV enrollment was missing from the response.');
      }
      setActiveEnrollmentId(data.enrollment.enrollmentId);
      setEnrollment(null);
      setApproved(false);
      setLoading(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to find an active TV pairing.');
    } finally {
      setLookingUp(false);
    }
  };

  const resetManualFlow = () => {
    setActiveEnrollmentId(null);
    setActivePairingCode('');
    setEnrollment(null);
    setApproved(false);
    setError(null);
  };

  const validLink =
    activeEnrollmentId !== null &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(activeEnrollmentId) &&
    /^\d{8}$/.test(activePairingCode);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
            <Tv className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">EDISON TV setup</p>
            <h1 className="text-2xl font-bold">Approve this TV</h1>
          </div>
        </div>

        {!validLink && !allowManualFallback && (
          <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This enrollment link is invalid or incomplete. Scan the QR code shown on your TV again.
          </p>
        )}

        {allowManualFallback && !activeEnrollmentId && currentUser.role === 'household_viewer' && (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              If scanning the QR code is unavailable, enter the eight-digit code shown on the TV.
            </p>
            <label className="block text-sm font-medium text-slate-700" htmlFor="tv-pairing-code">
              TV pairing code
            </label>
            <input
              id="tv-pairing-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{8}"
              maxLength={8}
              value={activePairingCode}
              onChange={(event) => setActivePairingCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 font-mono text-2xl tracking-[0.2em]"
              aria-describedby="tv-pairing-code-help"
            />
            <p id="tv-pairing-code-help" className="text-xs text-slate-500">
              The code expires after five minutes. Confirm the TV label before approval.
            </p>
            <button
              type="button"
              disabled={lookingUp || !/^\d{8}$/.test(activePairingCode)}
              onClick={lookupPairingCode}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 py-3 font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {lookingUp ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Tv className="h-4 w-4" />}
              {lookingUp ? 'Finding TV…' : 'Find TV'}
            </button>
            {error && (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {error}
              </p>
            )}
          </div>
        )}

        {validLink && currentUser.role !== 'household_viewer' && (
          <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            A household viewer account is required to approve a TV. Sign out and use the household owner account for this home.
          </p>
        )}

        {validLink && currentUser.role === 'household_viewer' && (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-slate-600">
              Only approve a TV you are currently setting up. Confirm the label and pairing code against the screen before continuing.
            </p>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading enrollment details…
              </div>
            ) : enrollment ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">TV label</p>
                <p className="mt-1 text-lg font-semibold">{enrollment.deviceLabel}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Pairing code</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em]">{activePairingCode}</p>
                <p className="mt-3 text-xs text-slate-500">
                  Expires {new Date(enrollment.expiresAt).toLocaleTimeString()} · Status: {enrollment.status}
                </p>
              </div>
            ) : null}

            {error && (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {error}
              </p>
            )}

            {error && !enrollment && !loading && (
              <button
                type="button"
                onClick={() => setDetailRequestId((attempt) => attempt + 1)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Retry loading TV details
              </button>
            )}

            {approved && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                TV approved. You can return to the television.
              </div>
            )}

            {!approved && enrollment?.status === 'pending' && !loading && (
              <button
                type="button"
                disabled={approving || !activePairingCode}
                onClick={approve}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 py-3 font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {approving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {approving ? 'Approving…' : 'Approve this TV'}
              </button>
            )}

            {enrollment && enrollment.status !== 'pending' && !approved && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                This enrollment is {enrollment.status} and can no longer be approved. Start setup again on the TV if needed.
              </p>
            )}

            {allowManualFallback && (approved || (enrollment && enrollment.status !== 'pending')) && (
              <button
                type="button"
                onClick={resetManualFlow}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Connect another TV
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
