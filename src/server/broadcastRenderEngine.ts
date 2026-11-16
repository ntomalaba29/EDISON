import crypto from 'node:crypto';
import type {
  AdCreativeRecord,
  BroadcastRenderJobResult,
  BroadcastRenderVerificationReport,
  BroadcastRenderVerifyCheckItem,
  BroadcastResolutionProfile,
  BroadcastValidationIssue,
  PlatformRenderTarget,
  QrLinkRecord,
} from '../types/edison.ts';

function sha256Hex(payload: string): string {
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return [15, 23, 42];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const linearize = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(rgb[0]) + 0.7152 * linearize(rgb[1]) + 0.0722 * linearize(rgb[2]);
}

export function computeWcagContrastRatio(bgHex: string, fgHex: string): number {
  const l1 = relativeLuminance(hexToRgb(bgHex));
  const l2 = relativeLuminance(hexToRgb(fgHex));
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return Number(((bright + 0.05) / (dark + 0.05)).toFixed(2));
}

function inferInputContainer(creative: AdCreativeRecord): string {
  if (creative.mode === 'text_only_commercial') return 'text_only';
  if (creative.mode === 'option_a_studio') return 'studio_json_canvas';
  if (creative.optionB) {
    const url = creative.optionB.fileUrl.toLowerCase();
    if (url.endsWith('.webm')) return 'webm';
    if (url.endsWith('.mp4')) return 'mp4';
    if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'jpg';
    if (url.endsWith('.webp')) return 'webp';
    return 'png';
  }
  return 'unknown';
}

export function compileBroadcastRenderJob(params: {
  creative: AdCreativeRecord;
  qrLink: QrLinkRecord | null;
  resolutionProfile?: BroadcastResolutionProfile;
}): BroadcastRenderJobResult {
  const { creative, qrLink } = params;
  const resolutionProfile: BroadcastResolutionProfile =
    params.resolutionProfile === '4k_uhd' ? '4k_uhd' : '1080p_fhd';
  const targetDimensions =
    resolutionProfile === '4k_uhd'
      ? ({ width: 3840, height: 2160, aspectRatio: '16:9' } as const)
      : ({ width: 1920, height: 1080, aspectRatio: '16:9' } as const);

  const issues: BroadcastValidationIssue[] = [];

  // 1. Duration bounds
  const maxDur = creative.mode === 'option_b_upload' ? 120 : 60;
  if (creative.displayDurationSeconds < 5 || creative.displayDurationSeconds > maxDur) {
    issues.push({
      code: 'DURATION_OUT_OF_RANGE',
      severity: 'blocking',
      message: `Display duration (${creative.displayDurationSeconds}s) outside broadcast range (5s–${maxDur}s).`,
    });
  }

  // 2. Contrast & Overscan Title-Safe Margins (5%–95%)
  let contrastRatio: number | null = null;
  let safeMarginPassed = true;

  if (creative.mode === 'option_a_studio' && creative.optionA) {
    contrastRatio = computeWcagContrastRatio(
      creative.optionA.backgroundColor,
      creative.optionA.textColor
    );
    if (
      contrastRatio < 4.5 &&
      (!creative.optionA.backgroundImageUrl || creative.optionA.scrimOpacity < 0.45)
    ) {
      issues.push({
        code: 'LOW_CONTRAST_RATIO',
        severity: 'blocking',
        message: `Option A colour contrast (${contrastRatio}:1) is below 4.5:1 TV legibility threshold.`,
      });
    }
    for (const el of creative.optionA.elements) {
      if (!el.visible) continue;
      if (
        el.xPct < 5 ||
        el.yPct < 5 ||
        el.xPct + el.widthPct > 95 ||
        el.yPct + el.heightPct > 95
      ) {
        safeMarginPassed = false;
        issues.push({
          code: 'OVERSCAN_SAFE_MARGIN_VIOLATION',
          severity: 'blocking',
          message: `Element "${el.label}" exceeds 5% TV overscan title-safe margin (x=${el.xPct}%, y=${el.yPct}%, right=${el.xPct + el.widthPct}%, bottom=${el.yPct + el.heightPct}%).`,
        });
      }
      if (el.kind === 'qr_block' && el.widthPct < 12) {
        issues.push({
          code: 'QR_SIZE_TOO_SMALL',
          severity: 'blocking',
          message: `QR box width (${el.widthPct}%) is below minimum 12% scannability floor on living-room TVs.`,
        });
      }
    }
  } else if (creative.mode === 'text_only_commercial' && creative.textOnly) {
    contrastRatio = computeWcagContrastRatio(
      creative.textOnly.backgroundColor,
      creative.textOnly.textColor
    );
    if (contrastRatio < 4.5) {
      issues.push({
        code: 'LOW_CONTRAST_RATIO',
        severity: 'blocking',
        message: `Text-Only commercial colour contrast (${contrastRatio}:1) is below 4.5:1 TV legibility threshold.`,
      });
    }
  } else if (creative.mode === 'option_b_upload' && creative.optionB) {
    if (!creative.optionB.aspectRatioValid) {
      issues.push({
        code: 'EXTERNAL_ASPECT_WARNING',
        severity: 'warning',
        message: `Uploaded asset (${creative.optionB.aspectRatioLabel}) requires 16:9 letterbox/pillarbox pad filter cleanly inside render canvas.`,
      });
    }
  }

  // 3. QR Vision & Integrity Gate (Never silently overwrite mismatched external QR)
  let qrPassed = true;
  let inspectionStatus = 'verified_active_link';

  if (!creative.qrToken || !qrLink || qrLink.status !== 'active') {
    qrPassed = false;
    inspectionStatus = !creative.qrToken ? 'missing_token' : qrLink?.status ?? 'missing_link';
    issues.push({
      code: 'QR_MISSING_OR_INACTIVE',
      severity: 'blocking',
      message: 'Active /r/:token QR destination link is required before broadcast rendering.',
    });
  }

  if (creative.mode === 'option_b_upload' && creative.optionB) {
    inspectionStatus = creative.optionB.qrInspectionStatus;
    if (creative.optionB.qrInspectionStatus === 'decoded_mismatch') {
      qrPassed = false;
      issues.push({
        code: 'QR_DESTINATION_MISMATCH_BLOCK',
        severity: 'blocking',
        message:
          'Option B asset embeds a conflicting external QR destination. Silent overwrite is prohibited; advertiser must re-export or clear review flag.',
      });
    } else if (
      creative.optionB.qrInspectionStatus === 'none_found' &&
      !creative.optionB.qrOverlayConfirmed
    ) {
      qrPassed = false;
      issues.push({
        code: 'QR_OVERLAY_MISSING',
        severity: 'blocking',
        message:
          'External asset has no embedded QR code and safe-zone overlay placement is not confirmed.',
      });
    }
  }

  // 4. Audio Loudness & Container Transcoding Spec
  const inputContainer = inferInputContainer(creative);
  const isVideoUpload =
    creative.mode === 'option_b_upload' &&
    creative.optionB?.mediaKind === 'video' &&
    creative.optionB.hasAudioTrack !== false;

  const audioLoudnessSpec: BroadcastRenderJobResult['audioLoudnessSpec'] = isVideoUpload
    ? {
        hasAudioTrack: true,
        standard: 'ITU-R BS.1770-4 / EBU R128',
        targetIntegratedLufs: -23.0,
        maxTruePeakDbtp: -1.0,
        filterExpression: 'loudnorm=I=-23:TP=-1.0:LRA=7:linear=true',
      }
    : {
        hasAudioTrack: false,
        standard: 'SILENT_VIDEO_LESS_CARD',
        targetIntegratedLufs: null,
        maxTruePeakDbtp: null,
        filterExpression: 'anullsrc=r=48000:cl=stereo,volume=0',
      };

  const maxBitrate = resolutionProfile === '4k_uhd' ? 15000 : 6500;
  const videoCodec =
    resolutionProfile === '4k_uhd' ? 'HEVC Main10@L5.0' : 'H.264 High@L4.1';

  const platformTargets: PlatformRenderTarget[] = [
    {
      platformId: 'simulation_tv',
      targetVideoCodec: videoCodec,
      targetContainer: isVideoUpload ? 'hls_fmp4' : 'png_still_h264',
      maxVideoBitrateKbps: maxBitrate,
      audioProfile: isVideoUpload ? 'AAC-LC 48kHz 192kbps (-23 LUFS)' : 'Silent / No Audio',
      transcodeRequired: isVideoUpload || inputContainer === 'studio_json_canvas',
      notes: 'Reference web 16:9 simulation playback profile.',
    },
    {
      platformId: 'android_tv_tif',
      targetVideoCodec: videoCodec,
      targetContainer: 'hls_fmp4',
      maxVideoBitrateKbps: maxBitrate,
      audioProfile: isVideoUpload ? 'AAC-LC 48kHz 192kbps (-23 LUFS)' : 'Silent / Embedded AAC',
      transcodeRequired: true,
      notes: 'ExoPlayer / MediaCodec ABR HLS ladder with 2s closed-GOP keyframes.',
    },
    {
      platformId: 'samsung_tizen',
      targetVideoCodec: 'H.264 High@L4.1',
      targetContainer: 'mp4',
      maxVideoBitrateKbps: Math.min(12000, maxBitrate),
      audioProfile: isVideoUpload ? 'AAC-LC 48kHz 192kbps (-23 LUFS)' : 'Silent / Embedded AAC',
      transcodeRequired: inputContainer === 'webm' || isVideoUpload || inputContainer !== 'mp4',
      notes:
        inputContainer === 'webm'
          ? 'MANDATORY TRANSCODE: Samsung Tizen AVPlay excludes raw WebM; converted to H.264 MP4.'
          : 'Tizen AVPlay hardware decoder profile.',
    },
    {
      platformId: 'lg_webos',
      targetVideoCodec: videoCodec,
      targetContainer: 'hls_fmp4',
      maxVideoBitrateKbps: maxBitrate,
      audioProfile: isVideoUpload ? 'AAC-LC 48kHz 192kbps (-23 LUFS)' : 'Silent / Embedded AAC',
      transcodeRequired: true,
      notes: 'LG webOS Media pipeline with 5% overscan safe-zone margin lock.',
    },
  ];

  const blockingIssuesCount = issues.filter((i) => i.severity === 'blocking').length;
  const warningIssuesCount = issues.filter((i) => i.severity === 'warning').length;
  const renderStatus =
    blockingIssuesCount === 0 ? 'RENDER_BLUEPRINT_VERIFIED' : 'BLOCKED_FAILED_VALIDATION';

  const scaleFilter = `scale=${targetDimensions.width}:${targetDimensions.height}:force_original_aspect_ratio=decrease,pad=${targetDimensions.width}:${targetDimensions.height}:(ow-iw)/2:(oh-ih)/2:color=black,fps=25`;
  const ffmpegFilterGraphSpec = isVideoUpload
    ? `[0:v]${scaleFilter}[vout];[0:a]${audioLoudnessSpec.filterExpression}[aout]`
    : `[0:v]${scaleFilter}[vout];${audioLoudnessSpec.filterExpression}[aout]`;

  const payloadForHash = JSON.stringify({
    creativeId: creative.id,
    updatedAt: creative.updatedAt,
    resolutionProfile,
    renderStatus,
    qrToken: creative.qrToken,
    ffmpegFilterGraphSpec,
    targetIds: platformTargets.map((t) => `${t.platformId}:${t.targetVideoCodec}:${t.targetContainer}`),
  });
  const manifestSha256 = sha256Hex(payloadForHash);

  return {
    renderJobId: `rnd_${manifestSha256.slice(0, 12)}`,
    generatedAt: new Date().toISOString(),
    creativeId: creative.id,
    creativeTitle: creative.title,
    creativeMode: creative.mode,
    resolutionProfile,
    targetDimensions,
    renderStatus,
    ffmpegBinaryExecuted: false,
    isSoftwareSimulationOnly: true,
    hardwareTested: false,
    stageP6Deferred: true,
    durationSeconds: creative.displayDurationSeconds,
    contrastRatio,
    safeMarginPassed,
    qrVisionGate: {
      passed: qrPassed,
      qrToken: creative.qrToken,
      inspectionStatus,
      resolvedUrl: qrLink?.resolvedUrl ?? null,
      silentOverwriteBlocked: true,
    },
    audioLoudnessSpec,
    platformTargets,
    issues,
    blockingIssuesCount,
    warningIssuesCount,
    manifestSha256,
    ffmpegFilterGraphSpec,
  };
}

export function runBroadcastRenderVerificationSuite(): BroadcastRenderVerificationReport {
  const nowIso = '2026-11-16T08:00:00.000Z';
  const activeQr: QrLinkRecord = {
    token: 'rnd-ok',
    ownerId: 'usr_adv_01',
    label: 'Render Ok Link',
    destinationType: 'website',
    rawInput: 'https://edison.demo/offer',
    resolvedUrl: 'https://edison.demo/offer',
    resolvedHost: 'edison.demo',
    scheme: 'https',
    status: 'active',
    redirectRequestsTotal: 0,
    redirectIssuedTotal: 0,
    suspectedBotRequests: 0,
    deduplicatedNonBotRedirects: 0,
    lastRedirectRequestedAt: null,
    createdAt: nowIso,
  };

  const optionACreative: AdCreativeRecord = {
    id: 'crt_rnd_opta',
    ownerId: 'usr_adv_01',
    campaignId: 'cmp_comm_01',
    title: 'Option A Clear Commercial',
    mode: 'option_a_studio',
    displayDurationSeconds: 15,
    qrToken: 'rnd-ok',
    optionA: {
      templateId: 'commercial_offer',
      backgroundColor: '#0f172a',
      gradientEndColor: '#1e293b',
      useGradient: false,
      accentColor: '#38bdf8',
      textColor: '#ffffff',
      scrimOpacity: 0.5,
      logoUrl: null,
      productImageUrl: null,
      backgroundImageUrl: null,
      heading: 'Solar Home Kit Offer',
      description: 'Clean installation across Harare & Bulawayo.',
      promoText: 'Verified Commercial Offer',
      priceOrValue: '$199 Bundle',
      contactDetails: 'sales@edison.demo',
      websiteAddress: 'edison.demo/solar',
      callToAction: 'Scan QR for Spec Sheet',
      qrPlacement: 'bottom_right',
      elements: [
        {
          id: 'el_head',
          kind: 'headline',
          label: 'Headline',
          xPct: 8,
          yPct: 12,
          widthPct: 55,
          heightPct: 18,
          zIndex: 4,
          fontSizePx: 30,
          visible: true,
        },
        {
          id: 'el_qr',
          kind: 'qr_block',
          label: 'QR Code',
          xPct: 76,
          yPct: 58,
          widthPct: 16,
          heightPct: 30,
          zIndex: 8,
          fontSizePx: 12,
          visible: true,
        },
      ],
    },
    textOnly: null,
    optionB: null,
    safeZoneWarnings: [],
    contrastWarnings: [],
    status: 'ready_for_preview',
    isPrototypeSeed: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const textOnlyCreative: AdCreativeRecord = {
    id: 'crt_rnd_text',
    ownerId: 'usr_adv_01',
    campaignId: 'cmp_comm_02',
    title: 'Zero-Media Commercial Card',
    mode: 'text_only_commercial',
    displayDurationSeconds: 15,
    qrToken: 'rnd-ok',
    optionA: null,
    textOnly: {
      advertiserName: 'Harare Bookshop Ltd',
      headline: '20% Off Technical Textbooks',
      messageBody: 'Scan the QR code to reserve your term order online.',
      contactInfo: 'books.edison.demo',
      backgroundColor: '#1e293b',
      textColor: '#f8fafc',
      accentColor: '#38bdf8',
      qrPlacement: 'bottom_right',
    },
    optionB: null,
    safeZoneWarnings: [],
    contrastWarnings: [],
    status: 'ready_for_preview',
    isPrototypeSeed: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const mismatchOptionB: AdCreativeRecord = {
    id: 'crt_rnd_mismatch',
    ownerId: 'usr_adv_01',
    campaignId: 'cmp_comm_03',
    title: 'Conflicting External Upload',
    mode: 'option_b_upload',
    displayDurationSeconds: 20,
    qrToken: 'rnd-ok',
    optionA: null,
    textOnly: null,
    optionB: {
      mediaKind: 'video',
      fileUrl: '/uploads/edison_vid_1234567890abcdef1234.webm',
      originalFileName: 'ad-sample.webm',
      mimeType: 'video/webm',
      fileSizeBytes: 2400000,
      widthPx: 1920,
      heightPx: 1080,
      aspectRatioLabel: '16:9',
      aspectRatioValid: true,
      durationSeconds: 20,
      hasAudioTrack: true,
      audioNotice: 'Audio stream detected.',
      qrInspectionStatus: 'decoded_mismatch',
      decodedQrPayload: 'https://rogue-other-site.example',
      qrOverlayConfirmed: false,
      qrOverlayCorner: 'bottom_right',
      requiresAdminReviewFlag: true,
      contentAttested: true,
      validationWarnings: [],
      validationErrors: [],
    },
    safeZoneWarnings: [],
    contrastWarnings: [],
    status: 'flagged_for_review',
    isPrototypeSeed: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const validWebmVideo: AdCreativeRecord = {
    ...mismatchOptionB,
    id: 'crt_rnd_webm_ok',
    status: 'ready_for_preview',
    optionB: {
      ...mismatchOptionB.optionB!,
      qrInspectionStatus: 'decoded_matched',
      decodedQrPayload: 'https://edison.demo/r/rnd-ok',
      requiresAdminReviewFlag: false,
      qrOverlayConfirmed: false,
    },
  };

  const lowContrastOptA: AdCreativeRecord = {
    ...optionACreative,
    id: 'crt_rnd_lowc',
    optionA: {
      ...optionACreative.optionA!,
      backgroundColor: '#94a3b8',
      textColor: '#cbd5e1',
    },
  };

  const overscanViolationOptA: AdCreativeRecord = {
    ...optionACreative,
    id: 'crt_rnd_overscan',
    optionA: {
      ...optionACreative.optionA!,
      elements: [
        {
          id: 'el_edge',
          kind: 'headline',
          label: 'Edge Headline',
          xPct: 1,
          yPct: 12,
          widthPct: 50,
          heightPct: 18,
          zIndex: 4,
          fontSizePx: 24,
          visible: true,
        },
        optionACreative.optionA!.elements[1],
      ],
    },
  };

  const charityOptA: AdCreativeRecord = {
    ...optionACreative,
    id: 'crt_rnd_charity',
    campaignId: 'cmp_charity_seed',
    title: 'Apprenticeship Notice (Charity Free)',
    status: 'ready_for_preview',
  };

  const jobOptA = compileBroadcastRenderJob({
    creative: optionACreative,
    qrLink: activeQr,
    resolutionProfile: '1080p_fhd',
  });
  const jobText = compileBroadcastRenderJob({
    creative: textOnlyCreative,
    qrLink: activeQr,
    resolutionProfile: '4k_uhd',
  });
  const jobMismatch = compileBroadcastRenderJob({
    creative: mismatchOptionB,
    qrLink: activeQr,
  });
  const jobLowContrast = compileBroadcastRenderJob({
    creative: lowContrastOptA,
    qrLink: activeQr,
  });
  const jobOverscan = compileBroadcastRenderJob({
    creative: overscanViolationOptA,
    qrLink: activeQr,
  });
  const jobWebmOk = compileBroadcastRenderJob({
    creative: validWebmVideo,
    qrLink: activeQr,
    resolutionProfile: '1080p_fhd',
  });
  const jobCharity = compileBroadcastRenderJob({
    creative: charityOptA,
    qrLink: activeQr,
  });

  const checks: BroadcastRenderVerifyCheckItem[] = [
    {
      checkId: 'RND-01-OPTION-A-1080P-PASS',
      label: 'Option A Composition Safe-Zone, Contrast & SHA-256 1080p Blueprint',
      passed:
        jobOptA.renderStatus === 'RENDER_BLUEPRINT_VERIFIED' &&
        jobOptA.safeMarginPassed &&
        (jobOptA.contrastRatio ?? 0) >= 4.5 &&
        jobOptA.manifestSha256.length === 64,
      detail: `RenderJob ${jobOptA.renderJobId} verified (contrast ${jobOptA.contrastRatio}:1, sha256=${jobOptA.manifestSha256.slice(0, 12)}...).`,
    },
    {
      checkId: 'RND-02-TEXT-ONLY-4K-PASS',
      label: 'Zero-Media Commercial Text-Only 4K UHD Silent Card Blueprint',
      passed:
        jobText.renderStatus === 'RENDER_BLUEPRINT_VERIFIED' &&
        jobText.targetDimensions.width === 3840 &&
        jobText.audioLoudnessSpec.standard === 'SILENT_VIDEO_LESS_CARD',
      detail: `4K ${jobText.targetDimensions.width}x${jobText.targetDimensions.height} Text-Only card verified with silent audio-null filter.`,
    },
    {
      checkId: 'RND-03-OPTION-B-MISMATCH-BLOCKED',
      label: 'Conflicting External QR Blocked Fail-Closed (Zero Silent Overwrite)',
      passed:
        jobMismatch.renderStatus === 'BLOCKED_FAILED_VALIDATION' &&
        jobMismatch.issues.some((i) => i.code === 'QR_DESTINATION_MISMATCH_BLOCK') &&
        jobMismatch.qrVisionGate.silentOverwriteBlocked === true,
      detail:
        'Option B asset with decoded_mismatch QR blocked strictly without altering original embedded URL.',
    },
    {
      checkId: 'RND-04-LOW-CONTRAST-FAIL',
      label: 'TV Viewing Contrast Threshold (< 4.5:1) Rejected',
      passed:
        jobLowContrast.renderStatus === 'BLOCKED_FAILED_VALIDATION' &&
        jobLowContrast.issues.some((i) => i.code === 'LOW_CONTRAST_RATIO'),
      detail: `Low contrast (${jobLowContrast.contrastRatio}:1) rejected by readability gate.`,
    },
    {
      checkId: 'RND-05-OVERSCAN-MARGIN-FAIL',
      label: '5% TV Overscan Title-Safe Margin Violation Caught',
      passed:
        jobOverscan.renderStatus === 'BLOCKED_FAILED_VALIDATION' &&
        !jobOverscan.safeMarginPassed &&
        jobOverscan.issues.some((i) => i.code === 'OVERSCAN_SAFE_MARGIN_VIOLATION'),
      detail:
        'Element placed at x=1% outside 5%–95% TV safe rectangle flagged as blocking error.',
    },
    {
      checkId: 'RND-06-TIZEN-WEBM-TRANSCODE',
      label: 'Samsung Tizen AVPlay WebM -> H.264 MP4 Transcode Target Flagged',
      passed:
        jobWebmOk.renderStatus === 'RENDER_BLUEPRINT_VERIFIED' &&
        Boolean(
          jobWebmOk.platformTargets.find(
            (t) =>
              t.platformId === 'samsung_tizen' &&
              t.targetContainer === 'mp4' &&
              t.transcodeRequired
          )
        ),
      detail:
        'WebM upload emits mandatory H.264 High@L4.1 MP4 transcode rule for Samsung Tizen.',
    },
    {
      checkId: 'RND-07-LOUDNESS-EBU-R128',
      label: 'Audio-Bearing Video Enforces ITU-R BS.1770-4 / EBU R128 -23 LUFS Spec',
      passed:
        jobWebmOk.audioLoudnessSpec.hasAudioTrack &&
        jobWebmOk.audioLoudnessSpec.targetIntegratedLufs === -23 &&
        jobWebmOk.audioLoudnessSpec.maxTruePeakDbtp === -1 &&
        jobWebmOk.ffmpegBinaryExecuted === false,
      detail:
        'Audio loudness normalization filter graph loudnorm=I=-23:TP=-1.0 specified (software-first; no FFmpeg binary executed).',
    },
    {
      checkId: 'RND-08-CHARITY-SPOT-GATE',
      label: 'Charity Opportunity Creative Validates Independently of Billing',
      passed: jobCharity.renderStatus === 'RENDER_BLUEPRINT_VERIFIED' && jobCharity.stageP6Deferred,
      detail:
        'Charity spot cleared broadcast validation without payment or commercial contract dependency.',
    },
  ];

  const passedChecks = checks.filter((c) => c.passed).length;

  return {
    generatedAt: new Date().toISOString(),
    isSoftwareSimulationOnly: true,
    ffmpegBinaryExecuted: false,
    hardwareTested: false,
    stageP6Deferred: true,
    totalChecks: checks.length,
    passedChecks,
    allPassed: passedChecks === checks.length,
    checks,
  };
}
