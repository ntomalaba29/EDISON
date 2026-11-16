import { useCallback, useEffect, useState } from 'react';
import { Database, Film, Smartphone, Activity, CheckCircle2, RefreshCw } from 'lucide-react';
import { edisonFetch } from '../lib/csrfFetch';
import type { PublicUser } from '../types/edison';

interface RuntimeInfraPanelProps {
  currentUser: PublicUser;
}

export function RuntimeInfraPanel({ currentUser }: RuntimeInfraPanelProps) {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [pgVerifyResult, setPgVerifyResult] = useState<any>(null);
  const [mediaStatus, setMediaStatus] = useState<any>(null);
  const [auraDevices, setAuraDevices] = useState<any[]>([]);
  const [obsMetrics, setObsMetrics] = useState<any>(null);
  const [tvLabel, setTvLabel] = useState('Living Room Smart TV');
  const [platformId, setPlatformId] = useState<'android_tv_tif' | 'samsung_tizen' | 'lg_webos' | 'hdmi_cec_stb'>('android_tv_tif');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [mediaRes, auraRes] = await Promise.all([
        edisonFetch('/api/media/worker/status'),
        edisonFetch('/api/aura/devices'),
      ]);
      if (mediaRes.ok) setMediaStatus(await mediaRes.json());
      if (auraRes.ok) {
        const d = await auraRes.json();
        setAuraDevices(d.items ?? []);
      }

      if (currentUser.role === 'admin') {
        const [dbRes, obsRes] = await Promise.all([
          edisonFetch('/api/admin/database/status'),
          edisonFetch('/api/admin/observability/metrics'),
        ]);
        if (dbRes.ok) setDbStatus(await dbRes.json());
        if (obsRes.ok) setObsMetrics(await obsRes.json());
      }
    } catch {
      // Handled gracefully
    }
  }, [currentUser.role]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleVerifyPg16 = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await edisonFetch('/api/admin/database/verify-pglite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setPgVerifyResult(data);
        setFeedback('Verified real PostgreSQL 16+ schema migrations & JSON store ACID import.');
      } else {
        setFeedback(data.error || 'PG16 verification failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleInitiateAura = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await edisonFetch('/api/aura/pair/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tvLabel, platformId }),
      });
      const data = await res.json();
      if (res.ok && data.device) {
        await edisonFetch('/api/aura/pair/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: data.device.deviceId,
            pairingCode: data.device.pairingCode,
          }),
        });
        setFeedback(`AURA paired cleanly: ${data.device.tvLabel} (${data.device.platformId})`);
        await loadAll();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Phase 3 &amp; 4 Runtime Infrastructure (PG16, FFmpeg Worker, AURA Pairing &amp; Observability)
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Local verification of PostgreSQL 16+ SQL migrations, real /usr/bin/ffmpeg worker diagnostics, AURA pairing state machine, and circuit-breaker telemetry.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Runtime</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* FFmpeg Worker Diagnostics */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <Film className="w-4 h-4 text-blue-600" />
            <span>FFmpeg &amp; FFprobe Broadcast Worker</span>
          </div>
          {mediaStatus ? (
            <div className="space-y-1.5 font-mono text-[11px] text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
              <p>ffmpeg: {mediaStatus.diagnostics.ffmpegBin} ({mediaStatus.diagnostics.ffmpegAvailable ? 'READY' : 'MISSING'})</p>
              <p>ffprobe: {mediaStatus.diagnostics.ffprobeBin} ({mediaStatus.diagnostics.ffprobeAvailable ? 'READY' : 'MISSING'})</p>
              <p>concurrency={mediaStatus.diagnostics.maxConcurrency} · timeout={mediaStatus.diagnostics.jobTimeoutMs}ms · retries={mediaStatus.diagnostics.maxRetries}</p>
              <p>jobs tracked={mediaStatus.diagnostics.totalJobsTracked} (completed={mediaStatus.diagnostics.completedJobs})</p>
            </div>
          ) : (
            <p className="text-slate-500">Loading worker status...</p>
          )}
        </div>

        {/* AURA Pairing & Remote State */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <Smartphone className="w-4 h-4 text-indigo-600" />
            <span>AURA Companion Remote &amp; HDMI-CEC Handshake</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={tvLabel}
              onChange={(e) => setTvLabel(e.target.value)}
              className="flex-1 min-w-[160px] px-2.5 py-1.5 border border-slate-200 rounded"
              aria-label="AURA TV Label"
            />
            <select
              value={platformId}
              onChange={(e) => setPlatformId(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-200 rounded bg-white"
              aria-label="AURA Platform"
            >
              <option value="android_tv_tif">android_tv_tif</option>
              <option value="samsung_tizen">samsung_tizen</option>
              <option value="lg_webos">lg_webos</option>
              <option value="hdmi_cec_stb">hdmi_cec_stb</option>
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={handleInitiateAura}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded cursor-pointer disabled:opacity-50"
            >
              Pair Test TV
            </button>
          </div>
          <p className="text-[11px] text-slate-600 font-mono">
            Paired devices: {auraDevices.length} · hardwareTested=false (software state machine)
          </p>
        </div>

        {/* PostgreSQL 16+ Admin Panel */}
        {currentUser.role === 'admin' && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>PostgreSQL 16+ Schema &amp; ACID Backfill</span>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={handleVerifyPg16}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded cursor-pointer disabled:opacity-50"
              >
                Run Live PGlite PG16 Check
              </button>
            </div>
            {dbStatus && (
              <div className="font-mono text-[11px] bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
                <p>Active Store: {dbStatus.storageBackend.persistenceLabel}</p>
                <p>SQL Migrations Ready: {dbStatus.migrationsAvailable.length} versioned files (.up / .down)</p>
              </div>
            )}
            {pgVerifyResult && (
              <div className="font-mono text-[11px] bg-emerald-50 p-3 rounded border border-emerald-200 text-emerald-950 space-y-1">
                <p>Engine: {pgVerifyResult.verifiedWithEngine}</p>
                <p>Users={pgVerifyResult.importSummary.counts.users} · Campaigns={pgVerifyResult.importSummary.counts.campaigns} · CharityZeroLock={String(pgVerifyResult.importSummary.charityZeroCostVerified)}</p>
              </div>
            )}
          </div>
        )}

        {/* Observability & Circuit Breakers */}
        {currentUser.role === 'admin' && obsMetrics && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Activity className="w-4 h-4 text-amber-600" />
              <span>Reliability &amp; Circuit Breaker Telemetry</span>
            </div>
            <div className="font-mono text-[11px] bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
              <p>Requests={obsMetrics.totalHttpRequests} · 5xx={obsMetrics.totalHttp5xx} · p95={obsMetrics.p95RequestLatencyMs}ms</p>
              <p>QR Redirects={obsMetrics.qrRedirectCount} · QR p95={obsMetrics.qrRedirectP95Ms}ms</p>
              <p>Circuits: {obsMetrics.circuits.map((c: any) => `${c.dependency}=${c.state}`).join(' | ')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
