import type {
  BreakCalibrationBenchmarkReport,
  BreakChannelPredictorProfile,
  BreakDaypart,
  BreakDurationPredictionRequest,
  BreakDurationPredictionResult,
  BreakProgrammeGenre,
  RecordedStreamFixtureResult,
  SharedIntelSignalType,
} from '../types/edison.ts';

interface ChannelBreakSeed {
  channelNumber: number;
  channelName: string;
  broadcaster: string;
  scopeId: string;
  defaultSignalType: SharedIntelSignalType;
  baseSamplesSec: number[];
}

const CHANNEL_BREAK_SEEDS: ChannelBreakSeed[] = [
  {
    channelNumber: 101,
    channelName: 'BBC One HD (Sim)',
    broadcaster: 'BBC',
    scopeId: 'gb_freeview_bbcone_androidtv14_dvbt2',
    defaultSignalType: 'scte35',
    baseSamplesSec: [52, 56, 60, 62, 65, 68, 72, 74, 78, 82, 86, 94],
  },
  {
    channelNumber: 103,
    channelName: 'ITV1 HD (Sim)',
    broadcaster: 'ITV',
    scopeId: 'gb_freeview_itv1_androidtv14_dvbt2',
    defaultSignalType: 'scte35',
    baseSamplesSec: [92, 98, 106, 114, 120, 125, 130, 134, 138, 145, 152, 165],
  },
  {
    channelNumber: 201,
    channelName: 'ZDF HD (Sim)',
    broadcaster: 'ZDF',
    scopeId: 'de_hbbtv_zdf_webos23_dvbc',
    defaultSignalType: 'hbbtv',
    baseSamplesSec: [42, 46, 50, 54, 58, 60, 64, 66, 70, 74, 78, 84],
  },
  {
    channelNumber: 401,
    channelName: 'Premier Sport HD (Sim)',
    broadcaster: 'SportNet',
    scopeId: 'gb_ott_premiersport_tizen7_hls',
    defaultSignalType: 'av_pattern',
    // High variance / right-skewed stoppage breaks: high mean (~91s) but sharp lower tail (p10 ~22s)
    baseSamplesSec: [18, 22, 26, 48, 72, 88, 96, 118, 132, 145, 160, 175],
  },
];

const DAYPART_SHIFT_SEC: Record<BreakDaypart, number> = {
  morning: -8,
  daytime: 0,
  prime_time: 12,
  late_night: -12,
};

const GENRE_SCALE: Record<BreakProgrammeGenre, { scale: number; varianceBoost: number; defaultConfidence: number }> = {
  news: { scale: 0.9, varianceBoost: 0.85, defaultConfidence: 0.94 },
  drama: { scale: 1.05, varianceBoost: 0.9, defaultConfidence: 0.93 },
  entertainment: { scale: 1.0, varianceBoost: 1.0, defaultConfidence: 0.91 },
  live_sport: { scale: 0.88, varianceBoost: 1.45, defaultConfidence: 0.84 },
};

const SIGNAL_CONFIDENCE_FACTOR: Record<SharedIntelSignalType, number> = {
  scte35: 1.0,
  hbbtv: 0.98,
  channel_cadence: 0.93,
  av_pattern: 0.89,
};

function computeQuantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const clampedQ = Math.min(1, Math.max(0, q));
  const idx = (sortedAsc.length - 1) * clampedQ;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const frac = idx - lo;
  return sortedAsc[lo] * (1 - frac) + sortedAsc[hi] * frac;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function listChannelPredictorProfiles(): BreakChannelPredictorProfile[] {
  return CHANNEL_BREAK_SEEDS.map((seed) => {
    const sorted = [...seed.baseSamplesSec].sort((a, b) => a - b);
    const mean = sorted.reduce((acc, v) => acc + v, 0) / sorted.length;
    return {
      channelNumber: seed.channelNumber,
      channelName: seed.channelName,
      broadcaster: seed.broadcaster,
      scopeId: seed.scopeId,
      defaultSignalType: seed.defaultSignalType,
      baselineSampleCount: sorted.length,
      baselineP5Sec: round1(computeQuantile(sorted, 0.05)),
      baselineP10Sec: round1(computeQuantile(sorted, 0.1)),
      baselineP50Sec: round1(computeQuantile(sorted, 0.5)),
      baselineMeanSec: round1(mean),
      historicalBreaksSec: sorted,
    };
  });
}

/**
 * Predicts conservative commercial-break duration bounds (p5, p10, p50, mean) and
 * enforces ADR/spec gating: NEVER schedule an ad spot using mean duration.
 * Only permits break entry when remaining lower-bound p10 minus switching & safety buffer
 * exceeds the requested spot duration, p5 exceeds spot safety floor, confidence >= 0.82,
 * and DRM/HDCP protection is inactive.
 */
export function predictBreakDurationQuantiles(
  req: BreakDurationPredictionRequest
): BreakDurationPredictionResult {
  const channel =
    CHANNEL_BREAK_SEEDS.find((c) => c.channelNumber === req.channelNumber) ??
    CHANNEL_BREAK_SEEDS[0];

  const daypartShift = DAYPART_SHIFT_SEC[req.daypart];
  const genreConfig = GENRE_SCALE[req.programmeGenre];
  const sigFactor = SIGNAL_CONFIDENCE_FACTOR[req.signalType];

  // Combine channel historical empirical samples scaled for daypart/genre with optional caller observations
  const baselineAdjusted = channel.baseSamplesSec.map((sec) => {
    const shifted = sec * genreConfig.scale + daypartShift;
    return Math.max(12, round1(shifted));
  });

  const combinedSamples = [
    ...baselineAdjusted,
    ...(req.observedHistoricalBreaksSec ?? []).map((x) => Math.max(8, round1(x))),
  ].sort((a, b) => a - b);

  const sampleCount = combinedSamples.length;
  const rawMean = combinedSamples.reduce((acc, v) => acc + v, 0) / sampleCount;
  const variance =
    combinedSamples.reduce((acc, v) => acc + Math.pow(v - rawMean, 2), 0) / sampleCount;
  const rawStdDev = Math.sqrt(variance) * genreConfig.varianceBoost;

  // Apply mild dispersion-aware shrinkage to lower tail when genre variance is elevated
  const spreadPenaltySec = req.programmeGenre === 'live_sport' ? Math.min(10, rawStdDev * 0.1) : 0;

  const p5Sec = Math.max(8, round1(computeQuantile(combinedSamples, 0.05) - spreadPenaltySec));
  const p10Sec = Math.max(
    p5Sec,
    round1(computeQuantile(combinedSamples, 0.1) - spreadPenaltySec * 0.75)
  );
  const p50Sec = Math.max(p10Sec, round1(computeQuantile(combinedSamples, 0.5)));
  const meanSec = round1(rawMean);
  const stdDevSec = round1(rawStdDev);

  const elapsedBreakSec = Math.max(0, round1(req.elapsedBreakSec ?? 0));
  const remainingP5Sec = Math.max(0, round1(p5Sec - elapsedBreakSec));
  const remainingP10Sec = Math.max(0, round1(p10Sec - elapsedBreakSec));
  const remainingMeanSec = Math.max(0, round1(meanSec - elapsedBreakSec));

  const switchingOverheadSec = Math.max(0, round1(req.switchingOverheadSec ?? 2));
  const safetyBufferSeconds = Math.max(2, round1(req.safetyBufferSeconds ?? 5));
  const requestedAdDurationSec = Math.max(5, Math.round(req.requestedAdDurationSec));

  const effectiveSafeWindowSec = Math.max(
    0,
    Math.floor(remainingP10Sec - switchingOverheadSec - safetyBufferSeconds)
  );
  const meanWindowSec = Math.max(
    0,
    Math.floor(remainingMeanSec - switchingOverheadSec - safetyBufferSeconds)
  );

  const confidenceScore = round2(
    Math.min(
      0.99,
      Math.max(
        0.1,
        req.confidenceScore ?? genreConfig.defaultConfidence * sigFactor
      )
    )
  );

  const drmProtected = Boolean(req.drmProtected);
  const wouldMeanOverestimate =
    meanWindowSec >= requestedAdDurationSec &&
    (effectiveSafeWindowSec < requestedAdDurationSec || remainingP5Sec < requestedAdDurationSec);

  let safeToSchedule = true;
  let decision: BreakDurationPredictionResult['decision'] = 'SCHEDULE_WITH_P10_BOUND';
  let decisionReason = '';

  if (drmProtected) {
    safeToSchedule = false;
    decision = 'SKIP_DRM_PROTECTED';
    decisionReason =
      'Fail-closed skip: stream flagged as DRM/HDCP protected. Never intercept or overlay protected playback.';
  } else if (confidenceScore < 0.82) {
    safeToSchedule = false;
    decision = 'SKIP_LOW_CONFIDENCE';
    decisionReason = `Fail-closed skip: detection confidence ${confidenceScore} < 0.82 threshold; ordinary TV viewing preserved.`;
  } else if (
    effectiveSafeWindowSec < requestedAdDurationSec ||
    remainingP5Sec < requestedAdDurationSec + 2
  ) {
    safeToSchedule = false;
    decision = 'SKIP_MEAN_UNSAFE_P10_SHORT';
    decisionReason = wouldMeanOverestimate
      ? `Rejected despite mean window (${meanWindowSec}s >= ${requestedAdDurationSec}s): lower-bound p10 safe window is ${effectiveSafeWindowSec}s (p5=${remainingP5Sec}s), avoiding late cut-back.`
      : `Conservative skip: lower-bound p10 safe window (${effectiveSafeWindowSec}s) or p5 floor (${remainingP5Sec}s) cannot guarantee ${requestedAdDurationSec}s spot + ${switchingOverheadSec}s switch + ${safetyBufferSeconds}s buffer.`;
  } else {
    decisionReason = `Safe lower-bound approval: p10 remaining ${remainingP10Sec}s -> ${effectiveSafeWindowSec}s safe window accommodates ${requestedAdDurationSec}s ad spot cleanly.`;
  }

  return {
    channelNumber: channel.channelNumber,
    channelName: channel.channelName,
    scopeId: channel.scopeId,
    daypart: req.daypart,
    programmeGenre: req.programmeGenre,
    signalType: req.signalType,
    sampleCount,
    p5Sec,
    p10Sec,
    p50Sec,
    meanSec,
    stdDevSec,
    elapsedBreakSec,
    remainingP5Sec,
    remainingP10Sec,
    remainingMeanSec,
    switchingOverheadSec,
    safetyBufferSeconds,
    effectiveSafeWindowSec,
    requestedAdDurationSec,
    confidenceScore,
    safeToSchedule,
    wouldMeanOverestimate,
    decision,
    decisionReason,
    isSoftwareSimulationOnly: true,
    hardwareTested: false,
    stageP6Deferred: true,
    predictedAt: new Date().toISOString(),
  };
}

interface RecordedStreamBenchmarkFixture {
  fixtureId: string;
  title: string;
  request: BreakDurationPredictionRequest;
  groundTruthIsBreak: boolean;
  actualRemainingDurationSec: number;
  detectionLatencyMs: number;
  expectedSafeToSchedule: boolean;
  expectMeanOverestimationGuard?: boolean;
}

const RECORDED_STREAM_CALIBRATION_FIXTURES: RecordedStreamBenchmarkFixture[] = [
  {
    fixtureId: 'FIX-01-SCTE35-ITV-PRIME',
    title: 'ITV1 Prime-Time Drama Clean SCTE-35 Splice',
    request: {
      channelNumber: 103,
      daypart: 'prime_time',
      programmeGenre: 'drama',
      signalType: 'scte35',
      elapsedBreakSec: 0,
      requestedAdDurationSec: 30,
      switchingOverheadSec: 2,
      safetyBufferSeconds: 5,
      confidenceScore: 0.96,
      drmProtected: false,
    },
    groundTruthIsBreak: true,
    actualRemainingDurationSec: 124,
    detectionLatencyMs: 240,
    expectedSafeToSchedule: true,
  },
  {
    fixtureId: 'FIX-02-SCTE35-BBC-DAYTIME',
    title: 'BBC One Daytime News Short Transition SCTE-35',
    request: {
      channelNumber: 101,
      daypart: 'daytime',
      programmeGenre: 'news',
      signalType: 'scte35',
      elapsedBreakSec: 0,
      requestedAdDurationSec: 20,
      switchingOverheadSec: 2,
      safetyBufferSeconds: 5,
      confidenceScore: 0.94,
      drmProtected: false,
    },
    groundTruthIsBreak: true,
    actualRemainingDurationSec: 60,
    detectionLatencyMs: 280,
    expectedSafeToSchedule: true,
  },
  {
    fixtureId: 'FIX-03-HBBTV-ZDF-ENTERTAINMENT',
    title: 'ZDF HD HbbTV Own-Session Evening Break',
    request: {
      channelNumber: 201,
      daypart: 'prime_time',
      programmeGenre: 'entertainment',
      signalType: 'hbbtv',
      elapsedBreakSec: 0,
      requestedAdDurationSec: 25,
      switchingOverheadSec: 2,
      safetyBufferSeconds: 5,
      confidenceScore: 0.91,
      drmProtected: false,
    },
    groundTruthIsBreak: true,
    actualRemainingDurationSec: 68,
    detectionLatencyMs: 360,
    expectedSafeToSchedule: true,
  },
  {
    fixtureId: 'FIX-04-SPORT-STOPPAGE-P10-GUARD',
    title: 'Live Sport Stoppage (High Mean ~80s, Short p10 Tail -> Must Skip)',
    request: {
      channelNumber: 401,
      daypart: 'daytime',
      programmeGenre: 'live_sport',
      signalType: 'av_pattern',
      elapsedBreakSec: 0,
      requestedAdDurationSec: 30,
      switchingOverheadSec: 2,
      safetyBufferSeconds: 5,
      confidenceScore: 0.85,
      drmProtected: false,
    },
    groundTruthIsBreak: true,
    actualRemainingDurationSec: 22,
    detectionLatencyMs: 620,
    expectedSafeToSchedule: false,
    expectMeanOverestimationGuard: true,
  },
  {
    fixtureId: 'FIX-05-FALSE-BLACK-SCENE-CUT',
    title: 'Non-Break Dramatic Fade-to-Black Scene Cut (Low Confidence -> 0% FPR)',
    request: {
      channelNumber: 103,
      daypart: 'prime_time',
      programmeGenre: 'drama',
      signalType: 'av_pattern',
      elapsedBreakSec: 0,
      requestedAdDurationSec: 15,
      switchingOverheadSec: 2,
      safetyBufferSeconds: 5,
      confidenceScore: 0.54,
      drmProtected: false,
    },
    groundTruthIsBreak: false,
    actualRemainingDurationSec: 0,
    detectionLatencyMs: 410,
    expectedSafeToSchedule: false,
  },
  {
    fixtureId: 'FIX-06-FALSE-HALFTIME-STUDIO-PAUSE',
    title: 'Non-Break Live Studio Micro-Pause (Low Confidence -> 0% FPR)',
    request: {
      channelNumber: 401,
      daypart: 'prime_time',
      programmeGenre: 'live_sport',
      signalType: 'av_pattern',
      elapsedBreakSec: 0,
      requestedAdDurationSec: 15,
      switchingOverheadSec: 2,
      safetyBufferSeconds: 5,
      confidenceScore: 0.62,
      drmProtected: false,
    },
    groundTruthIsBreak: false,
    actualRemainingDurationSec: 0,
    detectionLatencyMs: 520,
    expectedSafeToSchedule: false,
  },
  {
    fixtureId: 'FIX-07-DRM-PROTECTED-STREAM',
    title: 'DRM/HDCP Encrypted Stream Flagged -> Fail-Closed Skip',
    request: {
      channelNumber: 103,
      daypart: 'prime_time',
      programmeGenre: 'drama',
      signalType: 'scte35',
      elapsedBreakSec: 0,
      requestedAdDurationSec: 20,
      switchingOverheadSec: 2,
      safetyBufferSeconds: 5,
      confidenceScore: 0.98,
      drmProtected: true,
    },
    groundTruthIsBreak: true,
    actualRemainingDurationSec: 120,
    detectionLatencyMs: 180,
    expectedSafeToSchedule: false,
  },
  {
    fixtureId: 'FIX-08-LATE-ENTRY-MID-BREAK',
    title: 'Late Break Detection After 65s Elapsed (p10 Remaining Short -> Skip)',
    request: {
      channelNumber: 101,
      daypart: 'daytime',
      programmeGenre: 'entertainment',
      signalType: 'channel_cadence',
      elapsedBreakSec: 65,
      requestedAdDurationSec: 20,
      switchingOverheadSec: 2,
      safetyBufferSeconds: 5,
      confidenceScore: 0.9,
      drmProtected: false,
    },
    groundTruthIsBreak: true,
    actualRemainingDurationSec: 14,
    detectionLatencyMs: 450,
    expectedSafeToSchedule: false,
  },
  {
    fixtureId: 'FIX-09-LATE-NIGHT-TIGHT-SLOT',
    title: 'Late-Night Tight 15s Spot Verified Under Conservative p10',
    request: {
      channelNumber: 103,
      daypart: 'late_night',
      programmeGenre: 'entertainment',
      signalType: 'scte35',
      elapsedBreakSec: 0,
      requestedAdDurationSec: 15,
      switchingOverheadSec: 2,
      safetyBufferSeconds: 5,
      confidenceScore: 0.95,
      drmProtected: false,
    },
    groundTruthIsBreak: true,
    actualRemainingDurationSec: 96,
    detectionLatencyMs: 260,
    expectedSafeToSchedule: true,
  },
  {
    fixtureId: 'FIX-10-NONBREAK-NEWS-GRAPHIC-WIPE',
    title: 'Non-Break News Lower-Third Wipe (Sub-Threshold Confidence -> 0% FPR)',
    request: {
      channelNumber: 101,
      daypart: 'morning',
      programmeGenre: 'news',
      signalType: 'av_pattern',
      elapsedBreakSec: 0,
      requestedAdDurationSec: 15,
      switchingOverheadSec: 2,
      safetyBufferSeconds: 5,
      confidenceScore: 0.49,
      drmProtected: false,
    },
    groundTruthIsBreak: false,
    actualRemainingDurationSec: 0,
    detectionLatencyMs: 390,
    expectedSafeToSchedule: false,
  },
];

export function runRecordedStreamCalibrationBenchmark(): BreakCalibrationBenchmarkReport {
  const results: RecordedStreamFixtureResult[] = RECORDED_STREAM_CALIBRATION_FIXTURES.map(
    (fixture) => {
      const pred = predictBreakDurationQuantiles(fixture.request);
      const falsePositiveTriggered =
        !fixture.groundTruthIsBreak && pred.safeToSchedule === true;
      const safeConservativeSkip =
        fixture.groundTruthIsBreak && !fixture.expectedSafeToSchedule && !pred.safeToSchedule;
      const p10DidNotOverestimate = !fixture.groundTruthIsBreak
        ? true
        : pred.remainingP10Sec <= fixture.actualRemainingDurationSec + 6;
      const absErrorP10VsActualSec = fixture.groundTruthIsBreak
        ? round1(Math.abs(pred.remainingP10Sec - fixture.actualRemainingDurationSec))
        : 0;

      const decisionMatches = pred.safeToSchedule === fixture.expectedSafeToSchedule;
      const meanGuardOk = fixture.expectMeanOverestimationGuard
        ? pred.wouldMeanOverestimate === true
        : true;
      const passed =
        decisionMatches && !falsePositiveTriggered && p10DidNotOverestimate && meanGuardOk;

      return {
        fixtureId: fixture.fixtureId,
        title: fixture.title,
        channelNumber: fixture.request.channelNumber,
        daypart: fixture.request.daypart,
        programmeGenre: fixture.request.programmeGenre,
        signalType: fixture.request.signalType,
        groundTruthIsBreak: fixture.groundTruthIsBreak,
        actualRemainingDurationSec: fixture.actualRemainingDurationSec,
        requestedAdDurationSec: fixture.request.requestedAdDurationSec,
        predictedP5Sec: pred.remainingP5Sec,
        predictedP10Sec: pred.remainingP10Sec,
        predictedMeanSec: pred.remainingMeanSec,
        safeToScheduleDecision: pred.safeToSchedule,
        falsePositiveTriggered,
        safeConservativeSkip,
        p10DidNotOverestimate,
        detectionLatencyMs: fixture.detectionLatencyMs,
        absErrorP10VsActualSec,
        passed,
        note: pred.decisionReason,
      };
    }
  );

  const nonBreakCount = results.filter((r) => !r.groundTruthIsBreak).length;
  const falsePositivesCount = results.filter((r) => r.falsePositiveTriggered).length;
  const falsePositiveRatePct =
    nonBreakCount > 0 ? round1((falsePositivesCount / nonBreakCount) * 100) : 0;

  const trueBreakResults = results.filter((r) => r.groundTruthIsBreak);
  const skippedTrueBreaks = trueBreakResults.filter((r) => !r.safeToScheduleDecision).length;
  const falseNegativeSafeSkipRatePct =
    trueBreakResults.length > 0
      ? round1((skippedTrueBreaks / trueBreakResults.length) * 100)
      : 0;

  const containmentOkCount = trueBreakResults.filter((r) => r.p10DidNotOverestimate).length;
  const p10SafeContainmentRatePct =
    trueBreakResults.length > 0
      ? round1((containmentOkCount / trueBreakResults.length) * 100)
      : 100;

  const meanAbsoluteErrorSec =
    trueBreakResults.length > 0
      ? round1(
          trueBreakResults.reduce((acc, r) => acc + r.absErrorP10VsActualSec, 0) /
            trueBreakResults.length
        )
      : 0;

  const avgDetectionLatencyMs = Math.round(
    results.reduce((acc, r) => acc + r.detectionLatencyMs, 0) / results.length
  );

  const passedFixtures = results.filter((r) => r.passed).length;

  return {
    generatedAt: new Date().toISOString(),
    isSoftwareSimulationOnly: true,
    hardwareTested: false,
    stageP6Deferred: true,
    totalFixtures: results.length,
    passedFixtures,
    allPassed: passedFixtures === results.length && falsePositiveRatePct === 0,
    falsePositiveRatePct,
    falseNegativeSafeSkipRatePct,
    p10SafeContainmentRatePct,
    meanAbsoluteErrorSec,
    avgDetectionLatencyMs,
    fixtures: results,
  };
}
