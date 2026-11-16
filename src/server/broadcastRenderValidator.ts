import crypto from 'node:crypto';
import type {
  AdCreativeRecord,
  BroadcastContrastDiagnostic,
  BroadcastLoudnessSpec,
  BroadcastQrIntegrityDecision,
  BroadcastRenderBlueprint,
  BroadcastRenderFrameElement,
  BroadcastRenderOverviewSnapshot,
  BroadcastRenderValidationReport,
  BroadcastRenderVerificationReport,
  BroadcastRenderVerifyCheckItem,
  BroadcastSafeMarginIssue,
  BroadcastTargetPlatformStatus,
  CanvasElementLayout,
  QrLinkRecord,
  TvPlatformId,
} from '../types/edison.ts';

interface TvPlatformCodecSpec {
  platformId: TvPlatformId;
  platformName: string;
  preferredProfile: string;
  supportedContainers: ReadonlySet<string>;
  maxSpotSeconds: number;
}

const TV_PLATFORM_CODEC_SPECS: TvPlatformCodecSpec[] = [
  {
    platformId: 'simulation_tv',
    platformName: 'Simulation TV Player (16:9 Software)',
    preferredProfile: 'H.264/AAC-LC 1080p30 + PNG/WebP Stage',
    supportedContainers: new Set(['mp4', 'webm', 'png', 'jpg', 'webp', 'text_only']),
    maxSpotSeconds: 120,
  },
  {
    platformId: 'android_tv_tif',
    platformName: 'Android TV / Google TV (TIF)',
    preferredProfile: 'H.264 High@L4.1 / VP9 1080p60 (MediaCodec)',
    supportedContainers: new Set(['mp4', 'webm', 'png', 'jpg', 'webp', 'text_only']),
    maxSpotSeconds: 90,
  },
  {
    platformId: 'samsung_tizen',
    platformName: 'Samsung Tizen TV (AVPlay)',
    preferredProfile: 'H.264 High@L4.1 / HEVC 1080p50 (MP4/AAC)',
    supportedContainers: new Set(['mp4', 'png', 'jpg', 'webp', 'text_only']),
    maxSpotSeconds: 90,
  },
  {
    platformId: 'lg_webos',
    platformName: 'LG webOS TV (Media Pipeline)',
    preferredProfile: 'H.264/AAC-LC 1080p50 (MP4/WebM)',
    supportedContainers: new Set(['mp4', 'webm', 'png', 'jpg', 'webp', 'text_only']),
    maxSpotSeconds: 90,
  },
];

function sha256Hex(payload: string): string {
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return null;
  const raw = match[1];
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function srgbToLinear(channel8Bit: number): number {
  const s = channel8Bit / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  return (
    0.2126 * srgbToLinear(rgb.r) +
    0.7152 * srgbToLinear(rgb.g) +
    0.0722 * srgbToLinear(rgb.b)
  );
}

export function computeWcagContrastRatio(fgHex: string, bgHex: string): number {
  const fg = parseHexRgb(fgHex);
  const bg = parseHexRgb(bgHex);
  if (!fg || !bg) return 1;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return Number(((bright + 0.05) / (dark + 0.05)).toFixed(2));
}

function inferContainerFromCreative(creative: AdCreativeRecord): string {
  if (creative.mode === 'text_only_commercial') return 'text_only';
  if (creative.mode === 'option_a_studio') return 'png';
  const optB = creative.optionB;
  if (!optB) return 'png';
  const lowerUrl = optB.fileUrl.toLowerCase();
  const mime = optB.mimeType.toLowerCase();
  if (lowerUrl.endsWith('.webm') || mime.includes('webm')) return 'webm';
  if (lowerUrl.endsWith('.mp4') || mime.includes('mp4')) return 'mp4';
  if (lowerUrl.endsWith('.webp') || mime.includes('webp')) return 'webp';
  if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || mime.includes('jpeg')) return 'jpg';
  return 'png';
}

function boxesOverlap(a: CanvasElementLayout, b: CanvasElementLayout): boolean {
  const ax1 = a.xPct;
  const ax2 = a.xPct + a.widthPct;
  const ay1 = a.yPct;
  const ay2 = a.yPct + a.heightPct;
  const bx1 = b.xPct;
  const bx2 = b.xPct + b.widthPct;
  const by1 = b.yPct;
  const by2 = b.yPct + b.heightPct;
  return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
}

export function validateCreativeForBroadcastRender(params: {
  creative: AdCreativeRecord;
  qrLink: QrLinkRecord | null;
  referenceIso?: string;
}): BroadcastRenderValidationReport {
  const { creative, qrLink } = params;
  const evaluatedAt = params.referenceIso || new Date().toISOString();
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const contrastDiagnostics: BroadcastContrastDiagnostic[] = [];
  const safeMarginIssues: BroadcastSafeMarginIssue[] = [];

  const durationSeconds = Math.round(Number(creative.displayDurationSeconds || 0));
  const durationValid = Number.isFinite(durationSeconds) && durationSeconds >= 5 && durationSeconds <= 60;
  if (!durationValid) {
    blockingReasons.push(
      `Broadcast spot duration ${durationSeconds}s is outside EDISON 5s–60s linear break limits.`
    );
  }

  let resolutionLabel = '1920x1080 (16:9 Studio Canvas)';
  let aspectRatioValid = true;
  let requiresAdminReview = false;
  let qrIntegrityDecision: BroadcastQrIntegrityDecision = 'PASS_MATCHED_OR_OVERLAY';
  let headlineScalePx = 48;
  let bodyScalePx = 30;
  let qrQuietZonePct = 16;
  const frameElements: BroadcastRenderFrameElement[] = [];

  const container = inferContainerFromCreative(creative);

  // --- QR Link Integrity & Mode-Specific Checks ---
  if (creative.mode === 'option_a_studio') {
    const optA = creative.optionA;
    if (!optA) {
      blockingReasons.push('Option A Studio composition payload is missing.');
    } else {
      if (!optA.heading.trim()) {
        blockingReasons.push('Option A Studio composition requires a main headline.');
      }
      const primaryContrast = computeWcagContrastRatio(optA.textColor, optA.backgroundColor);
      contrastDiagnostics.push({
        pairLabel: 'Primary Copy vs Canvas Background',
        foregroundHex: optA.textColor,
        backgroundHex: optA.backgroundColor,
        contrastRatio: primaryContrast,
        requiredMinRatio: 4.5,
        passed: primaryContrast >= 4.5,
      });
      if (primaryContrast < 4.5) {
        blockingReasons.push(
          `Television text contrast ${primaryContrast}:1 (${optA.textColor} on ${optA.backgroundColor}) falls below WCAG 4.5:1 broadcast legibility floor.`
        );
      }
      if (optA.useGradient) {
        const gradContrast = computeWcagContrastRatio(optA.textColor, optA.gradientEndColor);
        contrastDiagnostics.push({
          pairLabel: 'Primary Copy vs Gradient End Background',
          foregroundHex: optA.textColor,
          backgroundHex: optA.gradientEndColor,
          contrastRatio: gradContrast,
          requiredMinRatio: 4.5,
          passed: gradContrast >= 4.5,
        });
        if (gradContrast < 4.5) {
          blockingReasons.push(
            `Gradient tail contrast ${gradContrast}:1 (${optA.textColor} on ${optA.gradientEndColor}) fails WCAG 4.5:1 broadcast legibility.`
          );
        }
      }

      const visibleEls = (optA.elements ?? []).filter((e) => e.visible);
      const qrBlock = visibleEls.find((e) => e.kind === 'qr_block');
      if (!qrBlock) {
        safeMarginIssues.push({
          elementId: 'qr_block',
          label: 'QR Code Block',
          issueType: 'qr_missing',
          detail: 'Option A creative must include a visible QR code block.',
        });
        blockingReasons.push('Visible QR code block is missing from Option A 16:9 canvas.');
      } else {
        qrQuietZonePct = qrBlock.widthPct;
        if (qrBlock.widthPct < 12 || qrBlock.heightPct < 20) {
          safeMarginIssues.push({
            elementId: qrBlock.id,
            label: qrBlock.label,
            issueType: 'qr_too_small',
            detail: `QR footprint ${qrBlock.widthPct}%x${qrBlock.heightPct}% is smaller than the 12%x20% 1080p living-room scan floor.`,
          });
          blockingReasons.push(
            `QR footprint (${qrBlock.widthPct}%x${qrBlock.heightPct}%) is too small for reliable smartphone camera scanning from 2.5m.`
          );
        }
      }

      for (const el of visibleEls) {
        const rightPct = el.xPct + el.widthPct;
        const bottomPct = el.yPct + el.heightPct;
        if (el.xPct < 5 || el.yPct < 5 || rightPct > 95 || bottomPct > 95) {
          safeMarginIssues.push({
            elementId: el.id,
            label: el.label,
            issueType: 'title_safe_violation',
            detail: `Element bounds (${el.xPct}%..${rightPct}% X, ${el.yPct}%..${bottomPct}% Y) breach the 90% ITU/EBU TV title-safe overscan box (5%–95%).`,
          });
          blockingReasons.push(
            `Safe-margin violation: "${el.label}" extends outside the 90% TV title-safe area (5%–95%).`
          );
        }

        if (qrBlock && el.id !== qrBlock.id && boxesOverlap(el, qrBlock)) {
          safeMarginIssues.push({
            elementId: el.id,
            label: el.label,
            issueType: 'qr_overlap',
            detail: `"${el.label}" overlaps the QR quiet-zone box and risks obscuring mobile scanning.`,
          });
          blockingReasons.push(
            `QR occlusion violation: "${el.label}" overlaps the QR code block.`
          );
        }

        const scale1080 = Math.round((el.fontSizePx || 16) * 2.25);
        if (el.kind === 'headline') headlineScalePx = Math.max(42, scale1080);
        if (el.kind === 'description') bodyScalePx = Math.max(28, scale1080);

        frameElements.push({
          id: el.id,
          kind: el.kind,
          label: el.label,
          xPx: Math.round((el.xPct / 100) * 1920),
          yPx: Math.round((el.yPct / 100) * 1080),
          widthPx: Math.round((el.widthPct / 100) * 1920),
          heightPx: Math.round((el.heightPct / 100) * 1080),
          fontSizePx1080p: scale1080,
        });
      }

      if (!creative.qrToken || !qrLink || qrLink.status !== 'active') {
        qrIntegrityDecision = 'WARN_NO_QR_ATTACHED';
        warnings.push(
          'Creative does not yet link an active /r/:token QR destination; attach an active link before campaign submission.'
        );
      }
    }
  } else if (creative.mode === 'text_only_commercial') {
    const tSpec = creative.textOnly;
    resolutionLabel = '1920x1080 (16:9 Typographic Broadcast Slate)';
    headlineScalePx = 56;
    bodyScalePx = 32;
    qrQuietZonePct = 17;

    if (!tSpec) {
      blockingReasons.push('Text-Only commercial specification payload is missing.');
    } else {
      if (
        tSpec.advertiserName.trim().length < 2 ||
        tSpec.headline.trim().length < 3 ||
        tSpec.messageBody.trim().length < 8
      ) {
        blockingReasons.push(
          'Text-Only commercial creative requires advertiser name, headline, and promotional message body.'
        );
      }

      const ratio = computeWcagContrastRatio(tSpec.textColor, tSpec.backgroundColor);
      contrastDiagnostics.push({
        pairLabel: 'Text-Only Copy vs Slate Background',
        foregroundHex: tSpec.textColor,
        backgroundHex: tSpec.backgroundColor,
        contrastRatio: ratio,
        requiredMinRatio: 4.5,
        passed: ratio >= 4.5,
      });
      if (ratio < 4.5) {
        blockingReasons.push(
          `Text-Only contrast ${ratio}:1 (${tSpec.textColor} on ${tSpec.backgroundColor}) falls below 4.5:1 TV legibility requirement.`
        );
      }

      const accentRatio = computeWcagContrastRatio(tSpec.accentColor, tSpec.backgroundColor);
      contrastDiagnostics.push({
        pairLabel: 'Accent Rule vs Slate Background',
        foregroundHex: tSpec.accentColor,
        backgroundHex: tSpec.backgroundColor,
        contrastRatio: accentRatio,
        requiredMinRatio: 3.0,
        passed: accentRatio >= 3.0,
      });
      if (accentRatio < 3.0) {
        warnings.push(
          `Accent colour ${tSpec.accentColor} has low luminance separation (${accentRatio}:1) against ${tSpec.backgroundColor}.`
        );
      }

      const qrLeftPx = tSpec.qrPlacement === 'bottom_left' ? 106 : 1488;
      frameElements.push(
        {
          id: 'txt_headline',
          kind: 'headline',
          label: tSpec.headline,
          xPx: tSpec.qrPlacement === 'bottom_left' ? 460 : 106,
          yPx: 300,
          widthPx: 1354,
          heightPx: 140,
          fontSizePx1080p: headlineScalePx,
        },
        {
          id: 'txt_body',
          kind: 'description',
          label: tSpec.messageBody,
          xPx: tSpec.qrPlacement === 'bottom_left' ? 460 : 106,
          yPx: 470,
          widthPx: 1354,
          heightPx: 260,
          fontSizePx1080p: bodyScalePx,
        },
        {
          id: 'txt_qr',
          kind: 'qr_block',
          label: 'Safe-Corner QR Slate',
          xPx: qrLeftPx,
          yPx: 660,
          widthPx: 326,
          heightPx: 326,
          fontSizePx1080p: 18,
        }
      );

      if (!creative.qrToken || !qrLink || qrLink.status !== 'active') {
        qrIntegrityDecision = 'WARN_NO_QR_ATTACHED';
        warnings.push(
          'Text-Only spot has no active /r/:token QR attached; viewers can use contact info or attach a QR prior to campaign submit.'
        );
      }
    }
  } else {
    // option_b_upload
    const optB = creative.optionB;
    if (!optB) {
      blockingReasons.push('Option B external media upload payload is missing.');
      aspectRatioValid = false;
      resolutionLabel = 'Unknown / Missing Asset';
    } else {
      resolutionLabel = `${optB.widthPx}x${optB.heightPx} (${optB.aspectRatioLabel})`;
      const ratio = optB.heightPx > 0 ? optB.widthPx / optB.heightPx : 0;
      const ratioInBounds = Math.abs(ratio - 16 / 9) <= 0.03;
      aspectRatioValid = Boolean(optB.aspectRatioValid && ratioInBounds);

      if (!aspectRatioValid) {
        blockingReasons.push(
          `Uploaded ${optB.widthPx}x${optB.heightPx} aspect ratio (${ratio.toFixed(3)}) is not 16:9 widescreen television standard.`
        );
      }
      if (optB.widthPx < 1280 || optB.heightPx < 720) {
        blockingReasons.push(
          `Asset resolution ${optB.widthPx}x${optB.heightPx} falls below the minimum 1280x720 (720p HD) broadcast standard.`
        );
      } else if (optB.widthPx < 1920 || optB.heightPx < 1080) {
        warnings.push(
          `Asset resolution ${optB.widthPx}x${optB.heightPx} passes 720p minimum; 1920x1080 Full HD is recommended for large Smart TVs.`
        );
      }
      if (!optB.contentAttested) {
        blockingReasons.push('Rights & broadcast compliance attestation must be confirmed.');
      }
      if (optB.validationErrors.length > 0) {
        blockingReasons.push(...optB.validationErrors);
      }

      // Enforce Option B QR non-overwrite policy
      if (optB.qrInspectionStatus === 'decoded_mismatch') {
        qrIntegrityDecision = 'BLOCK_MISMATCH';
        blockingReasons.push(
          `QR non-overwrite policy blocks submission: embedded QR payload ("${optB.decodedQrPayload ?? 'unknown'}") mismatches linked /r/${creative.qrToken ?? 'none'}.`
        );
      } else if (optB.qrInspectionStatus === 'suspected_unreadable') {
        qrIntegrityDecision = 'FLAG_ADMIN_HUMAN_REVIEW';
        requiresAdminReview = true;
        warnings.push(
          'Suspected/unreadable embedded QR flagged for mandatory human Admin visual inspection prior to approval.'
        );
      } else if (optB.qrInspectionStatus === 'none_found' && !optB.qrOverlayConfirmed) {
        qrIntegrityDecision = 'BLOCK_UNCONFIRMED_NO_QR';
        blockingReasons.push(
          'No QR detected in uploaded asset; confirm safe-corner EDISON QR overlay before broadcast rendering.'
        );
      } else {
        qrIntegrityDecision = 'PASS_MATCHED_OR_OVERLAY';
      }

      const cornerXPx = optB.qrOverlayCorner === 'bottom_left' ? 106 : 1488;
      frameElements.push(
        {
          id: 'optb_media_canvas',
          kind: optB.mediaKind,
          label: optB.originalFileName,
          xPx: 0,
          yPx: 0,
          widthPx: 1920,
          heightPx: 1080,
          fontSizePx1080p: 0,
        },
        {
          id: 'optb_qr_region',
          kind: 'qr_block',
          label:
            optB.qrInspectionStatus === 'none_found'
              ? 'EDISON Safe-Corner QR Overlay'
              : 'Verified Embedded QR Region',
          xPx: cornerXPx,
          yPx: 660,
          widthPx: 326,
          heightPx: 326,
          fontSizePx1080p: 18,
        }
      );
    }
  }

  // --- Target Smart TV Platform Codec Matrix ---
  const platformMatrix: BroadcastTargetPlatformStatus[] = TV_PLATFORM_CODEC_SPECS.map((spec) => {
    const directCompatible = spec.supportedContainers.has(container);
    const requiresTranscodeToH264Mp4 = container === 'webm' && !directCompatible;
    const withinSpotLimit = durationSeconds <= spec.maxSpotSeconds;

    if (!withinSpotLimit) {
      return {
        platformId: spec.platformId,
        platformName: spec.platformName,
        compatible: false,
        requiresTranscodeToH264Mp4,
        preferredProfile: spec.preferredProfile,
        reason: `Spot duration ${durationSeconds}s exceeds ${spec.maxSpotSeconds}s platform cap.`,
      };
    }

    if (requiresTranscodeToH264Mp4) {
      warnings.push(
        `${spec.platformName} requires H.264/AAC MP4 transcode for WebM upload prior to broadcast delivery.`
      );
      return {
        platformId: spec.platformId,
        platformName: spec.platformName,
        compatible: false,
        requiresTranscodeToH264Mp4: true,
        preferredProfile: spec.preferredProfile,
        reason: 'WebM container is unsupported natively on Samsung Tizen AVPlay; queue H.264/AAC MP4 transcode.',
      };
    }

    return {
      platformId: spec.platformId,
      platformName: spec.platformName,
      compatible: directCompatible,
      requiresTranscodeToH264Mp4: false,
      preferredProfile: spec.preferredProfile,
      reason: `Compatible container (${container}) with ${spec.preferredProfile}.`,
    };
  });

  // --- EBU R128 / ATSC A/85 Loudness Spec ---
  const isVideo = creative.mode === 'option_b_upload' && creative.optionB?.mediaKind === 'video';
  const hasAudioTrack = isVideo ? (creative.optionB?.hasAudioTrack ?? null) : false;
  const loudnessSpec: BroadcastLoudnessSpec = {
    targetStandard: 'EBU_R128_AND_ATSC_A85',
    targetIntegratedLufs: -23.0,
    truePeakMaxDbtp: -1.0,
    audioRequired: false,
    hasAudioTrack,
    loudnessNote: !isVideo
      ? 'Static/Text-Only TV slate renders silent video stream (no audio loudness normalization needed).'
      : hasAudioTrack
      ? 'Target integrated loudness -23.0 LUFS ± 0.5 LU (True Peak <= -1.0 dBTP) for seamless broadcast break transitions.'
      : 'Silent video stream confirmed; compatible with muted-break or subtitle-assisted playback.',
  };

  // --- Deterministic 1920x1080 Broadcast Render Blueprint ---
  const simulatedTranscodeCommand = isVideo
    ? `ffmpeg -i ${creative.optionB?.fileUrl ?? 'input.mp4'} -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -profile:v high -level:v 4.1 -pix_fmt yuv420p -r 25 -af "loudnorm=I=-23:TP=-1.0:LRA=7" -c:a aac -ar 48000 -b:a 192k -movflags +faststart out_${creative.id}.mp4`
    : `ffmpeg -loop 1 -t ${durationSeconds} -i rendered_${creative.id}.png -c:v libx264 -profile:v high -level:v 4.1 -pix_fmt yuv420p -r 25 -an -movflags +faststart out_${creative.id}.mp4`;

  const frameSpec = {
    canvasWidthPx: 1920 as const,
    canvasHeightPx: 1080 as const,
    titleSafeInsetPct: 5 as const,
    actionSafeInsetPct: 3.5 as const,
    headlineScalePx,
    bodyScalePx,
    qrQuietZonePct,
    elements: frameElements,
  };

  const renderSpecPayload = JSON.stringify({
    creativeId: creative.id,
    mode: creative.mode,
    durationSeconds,
    frameSpec,
    simulatedTranscodeCommand,
  });
  const renderSpecSha256 = sha256Hex(renderSpecPayload);

  const renderBlueprint: BroadcastRenderBlueprint = {
    blueprintId: `brp_${renderSpecSha256.slice(0, 12)}`,
    creativeId: creative.id,
    generatedAt: evaluatedAt,
    outputProfile: '1920x1080@25fps H.264 High@L4.1 yuv420p + AAC-LC 48kHz (-23 LUFS)',
    ffmpegWorkerConnected: false,
    simulatedTranscodeCommand,
    renderSpecSha256,
    frameSpec,
  };

  const broadcastReady = blockingReasons.length === 0 && !requiresAdminReview;

  return {
    creativeId: creative.id,
    creativeTitle: creative.title,
    mode: creative.mode,
    evaluatedAt,
    isSoftwareSimulationOnly: true,
    hardwareTested: false,
    stageP6Deferred: true,
    ffmpegWorkerConnected: false,
    broadcastReady,
    requiresAdminReview,
    blockingReasons,
    warnings,
    resolutionLabel,
    aspectRatioValid,
    durationSeconds,
    durationValid,
    contrastDiagnostics,
    safeMarginIssues,
    qrIntegrityDecision,
    loudnessSpec,
    platformMatrix,
    renderBlueprint,
  };
}

export function buildBroadcastRenderOverview(params: {
  creatives: AdCreativeRecord[];
  qrLinks: QrLinkRecord[];
  referenceIso?: string;
}): BroadcastRenderOverviewSnapshot {
  const qrByToken = new Map(params.qrLinks.map((q) => [q.token, q]));
  const items = params.creatives.map((creative) =>
    validateCreativeForBroadcastRender({
      creative,
      qrLink: creative.qrToken ? qrByToken.get(creative.qrToken) ?? null : null,
      referenceIso: params.referenceIso,
    })
  );

  return {
    generatedAt: params.referenceIso || new Date().toISOString(),
    isSoftwareSimulationOnly: true,
    hardwareTested: false,
    stageP6Deferred: true,
    ffmpegWorkerConnected: false,
    totalCreatives: items.length,
    broadcastReadyCount: items.filter((i) => i.broadcastReady).length,
    flaggedForReviewCount: items.filter((i) => i.requiresAdminReview && i.blockingReasons.length === 0)
      .length,
    blockedCount: items.filter((i) => i.blockingReasons.length > 0).length,
    items,
  };
}

export function runBroadcastRenderVerificationSuite(): BroadcastRenderVerificationReport {
  const now = new Date().toISOString();
  const activeQr: QrLinkRecord = {
    ownerId: 'usr_test',
    token: 'render-demo',
    label: 'Render Test QR',
    destinationType: 'website',
    rawInput: 'https://example.org/offer',
    resolvedUrl: 'https://example.org/offer',
    resolvedHost: 'example.org',
    scheme: 'https',
    status: 'active',
    redirectRequestsTotal: 0,
    redirectIssuedTotal: 0,
    suspectedBotRequests: 0,
    deduplicatedNonBotRedirects: 0,
    lastRedirectRequestedAt: null,
    createdAt: now,
  };

  // 1. Valid Option A 1080p studio composition
  const validOptionA: AdCreativeRecord = {
    id: 'crt_br_01',
    ownerId: 'usr_test',
    campaignId: null,
    qrToken: 'render-demo',
    title: 'Valid Option A 1080p Studio',
    mode: 'option_a_studio',
    displayDurationSeconds: 15,
    safeZoneWarnings: [],
    contrastWarnings: [],
    optionA: {
      templateId: 'commercial_offer',
      backgroundColor: '#0F172A',
      gradientEndColor: '#1E293B',
      useGradient: true,
      accentColor: '#38BDF8',
      textColor: '#F8FAFC',
      scrimOpacity: 0.4,
      logoUrl: null,
      productImageUrl: null,
      backgroundImageUrl: null,
      heading: 'Harare Fibre Offer',
      description: 'Reliable high-speed fibre broadband for small offices.',
      promoText: 'PROMO',
      priceOrValue: '$39/mo',
      contactDetails: 'sales@example.org',
      websiteAddress: 'https://example.org',
      callToAction: 'Scan QR',
      qrPlacement: 'bottom_right',
      elements: [
        {
          id: 'el_heading',
          kind: 'headline',
          label: 'Main Headline',
          xPct: 7,
          yPct: 16,
          widthPct: 55,
          heightPct: 18,
          zIndex: 5,
          fontSizePx: 28,
          visible: true,
        },
        {
          id: 'el_qr',
          kind: 'qr_block',
          label: 'QR Code Block',
          xPct: 76,
          yPct: 58,
          widthPct: 16,
          heightPct: 30,
          zIndex: 8,
          fontSizePx: 14,
          visible: true,
        },
      ],
    },
    optionB: null,
    status: 'ready_for_preview',
    isPrototypeSeed: false,
    createdAt: now,
    updatedAt: now,
  };
  const rValidOptionA = validateCreativeForBroadcastRender({
    creative: validOptionA,
    qrLink: activeQr,
    referenceIso: now,
  });

  // 2. Out-of-bounds Option A composition violating 90% title-safe zone & QR overlap
  const unsafeOptionA: AdCreativeRecord = {
    ...validOptionA,
    id: 'crt_br_02',
    optionA: {
      ...validOptionA.optionA!,
      elements: [
        {
          id: 'el_heading_edge',
          kind: 'headline',
          label: 'Edge Overflow Headline',
          xPct: 68,
          yPct: 55,
          widthPct: 30,
          heightPct: 20,
          zIndex: 5,
          fontSizePx: 28,
          visible: true,
        },
        {
          id: 'el_qr',
          kind: 'qr_block',
          label: 'QR Code Block',
          xPct: 76,
          yPct: 58,
          widthPct: 16,
          heightPct: 30,
          zIndex: 8,
          fontSizePx: 14,
          visible: true,
        },
      ],
    },
  };
  const rUnsafeOptionA = validateCreativeForBroadcastRender({
    creative: unsafeOptionA,
    qrLink: activeQr,
    referenceIso: now,
  });

  // 3. Text-Only contrast fail vs pass
  const badTextOnly: AdCreativeRecord = {
    ...validOptionA,
    id: 'crt_br_03_bad',
    mode: 'text_only_commercial',
    optionA: null,
    textOnly: {
      advertiserName: 'Low Contrast Bakery',
      headline: 'Morning Bread',
      messageBody: 'Fresh loaves baked daily in Avondale.',
      contactInfo: '+263 242 000111',
      backgroundColor: '#0F172A',
      accentColor: '#1E293B',
      textColor: '#1E293B',
      qrPlacement: 'bottom_right',
    },
  };
  const goodTextOnly: AdCreativeRecord = {
    ...badTextOnly,
    id: 'crt_br_03_good',
    textOnly: {
      ...badTextOnly.textOnly!,
      accentColor: '#38BDF8',
      textColor: '#F8FAFC',
    },
  };
  const rBadText = validateCreativeForBroadcastRender({
    creative: badTextOnly,
    qrLink: activeQr,
    referenceIso: now,
  });
  const rGoodText = validateCreativeForBroadcastRender({
    creative: goodTextOnly,
    qrLink: activeQr,
    referenceIso: now,
  });

  // 4. Option B WebM vs MP4 across Samsung Tizen & all 4 TV platforms
  const webmOptionB: AdCreativeRecord = {
    ...validOptionA,
    id: 'crt_br_04_webm',
    mode: 'option_b_upload',
    optionA: null,
    optionB: {
      mediaKind: 'video',
      fileUrl: '/uploads/edison_vid_0123456789abcdef0123.webm',
      originalFileName: 'promo.webm',
      mimeType: 'video/webm',
      fileSizeBytes: 2400000,
      widthPx: 1920,
      heightPx: 1080,
      aspectRatioLabel: '16:9',
      aspectRatioValid: true,
      durationSeconds: 15,
      hasAudioTrack: true,
      audioNotice: 'WebM audio detected',
      qrInspectionStatus: 'decoded_matched',
      decodedQrPayload: 'https://example.org/offer',
      qrOverlayConfirmed: false,
      qrOverlayCorner: 'bottom_right',
      requiresAdminReviewFlag: false,
      contentAttested: true,
      validationWarnings: [],
      validationErrors: [],
    },
  };
  const mp4OptionB: AdCreativeRecord = {
    ...webmOptionB,
    id: 'crt_br_04_mp4',
    optionB: {
      ...webmOptionB.optionB!,
      fileUrl: '/uploads/edison_vid_0123456789abcdef0123.mp4',
      originalFileName: 'promo.mp4',
      mimeType: 'video/mp4',
    },
  };
  const rWebm = validateCreativeForBroadcastRender({
    creative: webmOptionB,
    qrLink: activeQr,
    referenceIso: now,
  });
  const rMp4 = validateCreativeForBroadcastRender({
    creative: mp4OptionB,
    qrLink: activeQr,
    referenceIso: now,
  });

  // 5. Sub-HD / Non-16:9 aspect rejection
  const sdUpload: AdCreativeRecord = {
    ...mp4OptionB,
    id: 'crt_br_05_sd',
    optionB: {
      ...mp4OptionB.optionB!,
      widthPx: 640,
      heightPx: 480,
      aspectRatioLabel: '4:3',
      aspectRatioValid: false,
    },
  };
  const rSd = validateCreativeForBroadcastRender({
    creative: sdUpload,
    qrLink: activeQr,
    referenceIso: now,
  });

  // 6. QR non-overwrite: mismatch blocked + unreadable flagged
  const qrMismatch: AdCreativeRecord = {
    ...mp4OptionB,
    id: 'crt_br_06_mismatch',
    optionB: {
      ...mp4OptionB.optionB!,
      qrInspectionStatus: 'decoded_mismatch',
      decodedQrPayload: 'https://evil-override.example/phish',
    },
  };
  const qrUnreadable: AdCreativeRecord = {
    ...mp4OptionB,
    id: 'crt_br_06_unreadable',
    optionB: {
      ...mp4OptionB.optionB!,
      qrInspectionStatus: 'suspected_unreadable',
      decodedQrPayload: null,
      requiresAdminReviewFlag: true,
    },
  };
  const rMismatch = validateCreativeForBroadcastRender({
    creative: qrMismatch,
    qrLink: activeQr,
    referenceIso: now,
  });
  const rUnreadable = validateCreativeForBroadcastRender({
    creative: qrUnreadable,
    qrLink: activeQr,
    referenceIso: now,
  });

  const tizenWebm = rWebm.platformMatrix.find((p) => p.platformId === 'samsung_tizen');
  const checks: BroadcastRenderVerifyCheckItem[] = [
    {
      checkId: 'BR-01-OPTION-A-1080P-VALID',
      label: 'Option A 1080p Studio Creative Passes Safe-Margin, Contrast & Blueprint Gate',
      passed:
        rValidOptionA.broadcastReady &&
        rValidOptionA.contrastDiagnostics.every((c) => c.passed) &&
        rValidOptionA.renderBlueprint.renderSpecSha256.length === 64,
      detail: `broadcastReady=${rValidOptionA.broadcastReady}, SHA256=${rValidOptionA.renderBlueprint.renderSpecSha256.slice(0, 12)}...`,
    },
    {
      checkId: 'BR-02-TITLE-SAFE-AND-QR-OVERLAP',
      label: '90% Title-Safe Overscan & QR Occlusion Violations Detected and Blocked',
      passed:
        !rUnsafeOptionA.broadcastReady &&
        rUnsafeOptionA.safeMarginIssues.some((i) => i.issueType === 'title_safe_violation') &&
        rUnsafeOptionA.safeMarginIssues.some((i) => i.issueType === 'qr_overlap'),
      detail: `Detected ${rUnsafeOptionA.safeMarginIssues.length} safe-margin/overlap issues cleanly.`,
    },
    {
      checkId: 'BR-03-TEXT-ONLY-CONTRAST-AND-SCALE',
      label: 'Text-Only Commercial Contrast (<4.5:1 Rejected) & 1080p Scale (>=42px / >=28px) Verified',
      passed:
        !rBadText.broadcastReady &&
        rGoodText.broadcastReady &&
        rGoodText.renderBlueprint.frameSpec.headlineScalePx >= 42 &&
        rGoodText.renderBlueprint.frameSpec.bodyScalePx >= 28,
      detail: `Low contrast rejected (${rBadText.contrastDiagnostics[0]?.contrastRatio}:1), accessible slate passed (${rGoodText.contrastDiagnostics[0]?.contrastRatio}:1).`,
    },
    {
      checkId: 'BR-04-TV-CODEC-MATRIX-TIZEN-TRANSCODE',
      label: 'TV Codec Matrix Flags WebM Transcode on Samsung Tizen While Passing MP4 Across 4 Platforms',
      passed:
        Boolean(tizenWebm && !tizenWebm.compatible && tizenWebm.requiresTranscodeToH264Mp4) &&
        rMp4.platformMatrix.length === 4 &&
        rMp4.platformMatrix.every((p) => p.compatible),
      detail: 'Tizen AVPlay requires MP4 transcode for WebM; H.264 MP4 passes all 4 target decoders.',
    },
    {
      checkId: 'BR-05-SUB-HD-NON-16-9-BLOCKED',
      label: 'Sub-720p & Non-16:9 Uploads (640x480 4:3) Rejected by Broadcast Gate',
      passed: !rSd.broadcastReady && !rSd.aspectRatioValid && rSd.blockingReasons.length >= 2,
      detail: `Blocked 640x480 4:3 upload with ${rSd.blockingReasons.length} broadcast errors.`,
    },
    {
      checkId: 'BR-06-QR-NON-OVERWRITE-POLICY',
      label: 'QR Vision Policy Blocks Decoded Mismatch & Flags Suspected Unreadable for Admin Review',
      passed:
        !rMismatch.broadcastReady &&
        rMismatch.qrIntegrityDecision === 'BLOCK_MISMATCH' &&
        !rUnreadable.broadcastReady &&
        rUnreadable.requiresAdminReview &&
        rUnreadable.qrIntegrityDecision === 'FLAG_ADMIN_HUMAN_REVIEW',
      detail: 'Mismatch hard-blocked; unreadable QR quarantined for human Admin review.',
    },
    {
      checkId: 'BR-07-EBU-R128-LOUDNESS-AND-FFMPEG-BLUEPRINT',
      label: 'EBU R128 (-23 LUFS / -1.0 dBTP) Loudness & Deterministic 1080p Render Command Verified',
      passed:
        rMp4.loudnessSpec.targetIntegratedLufs === -23 &&
        rMp4.loudnessSpec.truePeakMaxDbtp === -1 &&
        rMp4.renderBlueprint.simulatedTranscodeCommand.includes('loudnorm=I=-23:TP=-1.0') &&
        rMp4.ffmpegWorkerConnected === false,
      detail: 'Deterministic H.264 High@L4.1 + EBU R128 command blueprint verified (ffmpegWorkerConnected=false).',
    },
    {
      checkId: 'BR-08-SOFTWARE-BOUNDARY-PRESERVED',
      label: 'Honest Software-First Render Boundary (hardwareTested=false, Stage P6 Deferred)',
      passed:
        rMp4.isSoftwareSimulationOnly === true &&
        rMp4.hardwareTested === false &&
        rMp4.stageP6Deferred === true,
      detail: 'Software simulation only; no FFmpeg worker or physical TV playback claimed.',
    },
  ];

  const passedChecks = checks.filter((c) => c.passed).length;

  return {
    generatedAt: now,
    isSoftwareSimulationOnly: true,
    hardwareTested: false,
    stageP6Deferred: true,
    ffmpegWorkerConnected: false,
    totalChecks: checks.length,
    passedChecks,
    allPassed: passedChecks === checks.length,
    checks,
  };
}
