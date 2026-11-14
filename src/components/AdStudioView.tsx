import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  FileImage,
  FileVideo,
  Layers,
  Link2,
  Palette,
  QrCode,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  AdCreativeRecord,
  AdStudioMode,
  CampaignRecord,
  CanvasElementLayout,
  ExternalQrInspectionStatus,
  OptionAComposition,
  OptionBUploadSpec,
  PublicUser,
  QrLinkRecord,
  QrPlacementPreset,
  StudioTemplateId,
} from '../types/edison';
import { QrCodePreview } from './QrCodePreview';
import { CopyReportFooter } from './CopyReportFooter';

interface AdStudioProps {
  currentUser: PublicUser | null;
  onNavigateAuth: () => void;
  onSummaryRefresh: () => Promise<void>;
}

interface TemplatePreset {
  id: StudioTemplateId;
  label: string;
  categoryNote: string;
  composition: OptionAComposition;
}

function buildDefaultElements(qrPlacement: QrPlacementPreset = 'bottom_right'): CanvasElementLayout[] {
  const qrBox =
    qrPlacement === 'bottom_left'
      ? { xPct: 7, yPct: 58, widthPct: 16, heightPct: 30 }
      : qrPlacement === 'sidebar_right'
      ? { xPct: 75, yPct: 24, widthPct: 18, heightPct: 34 }
      : { xPct: 76, yPct: 58, widthPct: 16, heightPct: 30 };

  const textWidth = qrPlacement === 'sidebar_right' ? 60 : 52;

  return [
    {
      id: 'el_logo',
      kind: 'logo',
      label: 'Brand Logo',
      xPct: 7,
      yPct: 8,
      widthPct: 15,
      heightPct: 12,
      zIndex: 4,
      fontSizePx: 16,
      visible: true,
    },
    {
      id: 'el_promo',
      kind: 'promo_badge',
      label: 'Promotional Banner',
      xPct: 24,
      yPct: 9,
      widthPct: 38,
      heightPct: 8,
      zIndex: 5,
      fontSizePx: 14,
      visible: true,
    },
    {
      id: 'el_heading',
      kind: 'headline',
      label: 'Main Headline',
      xPct: 7,
      yPct: 24,
      widthPct: textWidth,
      heightPct: 18,
      zIndex: 6,
      fontSizePx: 30,
      visible: true,
    },
    {
      id: 'el_desc',
      kind: 'description',
      label: 'Supporting Copy',
      xPct: 7,
      yPct: 44,
      widthPct: textWidth,
      heightPct: 16,
      zIndex: 5,
      fontSizePx: 16,
      visible: true,
    },
    {
      id: 'el_price',
      kind: 'price_value',
      label: 'Price / Salary / Value',
      xPct: 7,
      yPct: 62,
      widthPct: 28,
      heightPct: 10,
      zIndex: 6,
      fontSizePx: 22,
      visible: true,
    },
    {
      id: 'el_cta',
      kind: 'cta_button',
      label: 'Call to Action',
      xPct: 37,
      yPct: 62,
      widthPct: 24,
      heightPct: 10,
      zIndex: 7,
      fontSizePx: 16,
      visible: true,
    },
    {
      id: 'el_contact',
      kind: 'contact_info',
      label: 'Contact Details',
      xPct: 7,
      yPct: 76,
      widthPct: 44,
      heightPct: 8,
      zIndex: 4,
      fontSizePx: 14,
      visible: true,
    },
    {
      id: 'el_website',
      kind: 'website_url',
      label: 'Website Address',
      xPct: 7,
      yPct: 85,
      widthPct: 44,
      heightPct: 7,
      zIndex: 4,
      fontSizePx: 14,
      visible: true,
    },
    {
      id: 'el_product',
      kind: 'product_image',
      label: 'Product / Visual Feature',
      xPct: qrPlacement === 'sidebar_right' ? 7 : 63,
      yPct: qrPlacement === 'sidebar_right' ? 62 : 12,
      widthPct: qrPlacement === 'sidebar_right' ? 20 : 29,
      heightPct: qrPlacement === 'sidebar_right' ? 12 : 40,
      zIndex: 2,
      fontSizePx: 14,
      visible: true,
    },
    {
      id: 'el_qr',
      kind: 'qr_block',
      label: 'Verified QR Block',
      ...qrBox,
      zIndex: 10,
      fontSizePx: 14,
      visible: true,
    },
  ];
}

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'commercial_offer',
    label: 'Commercial Offer',
    categoryNote: 'General services & local promotions',
    composition: {
      templateId: 'commercial_offer',
      backgroundColor: '#0f172a',
      gradientEndColor: '#1e3a8a',
      useGradient: true,
      accentColor: '#2563eb',
      textColor: '#ffffff',
      scrimOpacity: 0.45,
      logoUrl: null,
      productImageUrl: null,
      backgroundImageUrl: null,
      heading: 'Save 25% on Home Insulation',
      description: 'Certified local installers with transparent quotes and 10-year guarantee.',
      promoText: 'AUTUMN PROMOTION · LIMITED BOOKINGS',
      priceOrValue: 'From $499 Installed',
      contactDetails: 'Tel: +44 20 7946 0190 · London & South East',
      websiteAddress: 'https://example.org/offer',
      callToAction: 'Scan QR for Quote',
      qrPlacement: 'bottom_right',
      elements: buildDefaultElements('bottom_right'),
    },
  },
  {
    id: 'retail_promo',
    label: 'Retail Store Promo',
    categoryNote: 'High-contrast offer & price highlight',
    composition: {
      templateId: 'retail_promo',
      backgroundColor: '#18181b',
      gradientEndColor: '#3f3f46',
      useGradient: true,
      accentColor: '#d97706',
      textColor: '#ffffff',
      scrimOpacity: 0.5,
      logoUrl: null,
      productImageUrl: null,
      backgroundImageUrl: null,
      heading: 'Weekend Appliance Clearance',
      description: 'Energy-rated kitchen appliances delivered next day across major metro areas.',
      promoText: '48-HOUR STORE EVENT',
      priceOrValue: 'Up to 35% Off RRP',
      contactDetails: 'High Street Showroom · Open Until 8 PM',
      websiteAddress: 'https://example.org/store',
      callToAction: 'Scan to Shop Deals',
      qrPlacement: 'bottom_right',
      elements: buildDefaultElements('bottom_right'),
    },
  },
  {
    id: 'product_launch',
    label: 'Product Launch',
    categoryNote: 'Feature visual + launch CTA',
    composition: {
      templateId: 'product_launch',
      backgroundColor: '#090d16',
      gradientEndColor: '#172554',
      useGradient: true,
      accentColor: '#0284c7',
      textColor: '#f8fafc',
      scrimOpacity: 0.4,
      logoUrl: null,
      productImageUrl: null,
      backgroundImageUrl: null,
      heading: 'Introducing the AeroPure 400',
      description: 'Quiet HEPA filtration engineered for bedrooms and home offices.',
      promoText: 'NEW RELEASE · 2026 SERIES',
      priceOrValue: '$189 Launch Price',
      contactDetails: 'Authorized Online & Retail Partners',
      websiteAddress: 'https://example.org/aeropure',
      callToAction: 'Scan for Specs',
      qrPlacement: 'sidebar_right',
      elements: buildDefaultElements('sidebar_right'),
    },
  },
  {
    id: 'brand_spotlight',
    label: 'Brand Spotlight',
    categoryNote: 'Editorial brand trust & contact layout',
    composition: {
      templateId: 'brand_spotlight',
      backgroundColor: '#f8fafc',
      gradientEndColor: '#e2e8f0',
      useGradient: true,
      accentColor: '#1d4ed8',
      textColor: '#0f172a',
      scrimOpacity: 0.25,
      logoUrl: null,
      productImageUrl: null,
      backgroundImageUrl: null,
      heading: 'Trusted Regional Accounting Partners',
      description: 'Fixed-fee payroll, tax filings, and cash-flow planning for independent businesses.',
      promoText: 'CHARTERED PRACTICE · EST. 2011',
      priceOrValue: 'Free 30-Min Consult',
      contactDetails: 'Birmingham & Midlands · hello@example.org',
      websiteAddress: 'https://example.org/advisory',
      callToAction: 'Scan to Book Call',
      qrPlacement: 'bottom_left',
      elements: buildDefaultElements('bottom_left'),
    },
  },
  {
    id: 'event_notice',
    label: 'Event & Expo',
    categoryNote: 'Dates, venue & registration QR',
    composition: {
      templateId: 'event_notice',
      backgroundColor: '#141e30',
      gradientEndColor: '#243b55',
      useGradient: true,
      accentColor: '#16a34a',
      textColor: '#ffffff',
      scrimOpacity: 0.45,
      logoUrl: null,
      productImageUrl: null,
      backgroundImageUrl: null,
      heading: 'Regional Small Business Trade Expo',
      description: 'Connect with local suppliers, lenders, and logistics advisors in one hall.',
      promoText: 'NOVEMBER 28 · EXHIBITION CENTRE',
      priceOrValue: 'Free Entry Pass',
      contactDetails: 'Doors 09:00–17:00 · Parking Available',
      websiteAddress: 'https://example.org/expo',
      callToAction: 'Scan for Free Pass',
      qrPlacement: 'bottom_right',
      elements: buildDefaultElements('bottom_right'),
    },
  },
  {
    id: 'opportunity_job',
    label: 'Opportunity · Job Vacancy',
    categoryNote: 'Structured job title, pay & direct apply QR',
    composition: {
      templateId: 'opportunity_job',
      backgroundColor: '#0f172a',
      gradientEndColor: '#1e293b',
      useGradient: false,
      accentColor: '#16a34a',
      textColor: '#f8fafc',
      scrimOpacity: 0.4,
      logoUrl: null,
      productImageUrl: null,
      backgroundImageUrl: null,
      heading: 'Apprentice Electrical Technicians Hiring',
      description: 'Paid on-site training, mentor support, and funded college day release.',
      promoText: 'VERIFIED OPPORTUNITY LISTING · CLOSES DEC 15',
      priceOrValue: '£24,500 Starting Pay',
      contactDetails: 'Midlands Engineering Co · Full-Time',
      websiteAddress: 'https://example.org/apprenticeships',
      callToAction: 'Scan to Apply Free',
      qrPlacement: 'bottom_right',
      elements: buildDefaultElements('bottom_right'),
    },
  },
  {
    id: 'opportunity_scholarship',
    label: 'Opportunity · Scholarship & Training',
    categoryNote: 'Education & funded skills programme',
    composition: {
      templateId: 'opportunity_scholarship',
      backgroundColor: '#ffffff',
      gradientEndColor: '#f1f5f9',
      useGradient: true,
      accentColor: '#0369a1',
      textColor: '#0f172a',
      scrimOpacity: 0.2,
      logoUrl: null,
      productImageUrl: null,
      backgroundImageUrl: null,
      heading: 'STEM Vocational Bursaries Open Now',
      description: 'Tuition support and toolkits for eligible technical students.',
      promoText: 'EDUCATION OPPORTUNITY · NO APPLICATION FEE',
      priceOrValue: 'Up to £4,000 Grant',
      contactDetails: 'Northern Polytechnic Trust · Deadline Jan 10',
      websiteAddress: 'https://example.org/bursaries',
      callToAction: 'Scan Eligibility Rules',
      qrPlacement: 'sidebar_right',
      elements: buildDefaultElements('sidebar_right'),
    },
  },
  {
    id: 'opportunity_grant',
    label: 'Opportunity · Grant / Tender',
    categoryNote: 'Funding & public procurement opportunity',
    composition: {
      templateId: 'opportunity_grant',
      backgroundColor: '#0c192c',
      gradientEndColor: '#1e3a5f',
      useGradient: true,
      accentColor: '#0d9488',
      textColor: '#ffffff',
      scrimOpacity: 0.4,
      logoUrl: null,
      productImageUrl: null,
      backgroundImageUrl: null,
      heading: 'Clean Workshop Micro-Grants 2026',
      description: 'Capital equipment funding for independent repair and fabrication firms.',
      promoText: 'PUBLIC FUNDING NOTICE · OPEN TENDER',
      priceOrValue: '£2,500–£15,000 Awards',
      contactDetails: 'Local Enterprise Fund · Closing Dec 30',
      websiteAddress: 'https://example.org/grants',
      callToAction: 'Scan Tender Portal',
      qrPlacement: 'bottom_right',
      elements: buildDefaultElements('bottom_right'),
    },
  },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const convert = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * convert(rgb.r) + 0.7152 * convert(rgb.g) + 0.0722 * convert(rgb.b);
}

function computeContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return Number(((bright + 0.05) / (dark + 0.05)).toFixed(2));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read selected file.'));
    reader.readAsDataURL(file);
  });
}

function scanCanvasWithJsqr(ctx: CanvasRenderingContext2D, width: number, height: number): string | null {
  if (width <= 0 || height <= 0) return null;
  const fullData = ctx.getImageData(0, 0, width, height);
  const direct = jsQR(fullData.data, width, height, { inversionAttempts: 'attemptBoth' });
  if (direct?.data) return direct.data;

  // Scan high-density lower corner quadrants where TV QR overlays are commonly embedded
  const cw = Math.max(120, Math.floor(width * 0.42));
  const ch = Math.max(120, Math.floor(height * 0.48));
  const regions = [
    { x: Math.max(0, width - cw), y: Math.max(0, height - ch) },
    { x: 0, y: Math.max(0, height - ch) },
    { x: Math.max(0, width - cw), y: 0 },
  ];
  for (const reg of regions) {
    const w = Math.min(cw, width - reg.x);
    const h = Math.min(ch, height - reg.y);
    if (w < 40 || h < 40) continue;
    const regionData = ctx.getImageData(reg.x, reg.y, w, h);
    const hit = jsQR(regionData.data, w, h, { inversionAttempts: 'attemptBoth' });
    if (hit?.data) return hit.data;
  }
  return null;
}

function doesDecodedQrMatchSelection(
  decodedPayload: string,
  qrToken: string,
  qrLinks: QrLinkRecord[]
): boolean {
  const cleanPayload = decodedPayload.trim().replace(/\/+$/, '').toLowerCase();
  if (!qrToken) return false;
  const expectedTokenSuffix = `/r/${qrToken.toLowerCase()}`;
  if (cleanPayload.endsWith(expectedTokenSuffix)) {
    return true;
  }
  const linked = qrLinks.find((q) => q.token === qrToken);
  if (linked) {
    const targetClean = linked.resolvedUrl.trim().replace(/\/+$/, '').toLowerCase();
    if (cleanPayload === targetClean) {
      return true;
    }
  }
  return false;
}

async function inspectExternalImage(
  fileUrl: string
): Promise<{
  widthPx: number;
  heightPx: number;
  decodedQr: string | null;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || 0;
      const h = img.naturalHeight || 0;
      const maxScanW = Math.min(w, 1280);
      const scale = w > 0 ? maxScanW / w : 1;
      const scanW = Math.max(1, Math.round(w * scale));
      const scanH = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = scanW;
      canvas.height = scanH;
      const ctx = canvas.getContext('2d');
      let decodedQr: string | null = null;
      if (ctx) {
        ctx.drawImage(img, 0, 0, scanW, scanH);
        decodedQr = scanCanvasWithJsqr(ctx, scanW, scanH);
      }
      resolve({ widthPx: w, heightPx: h, decodedQr });
    };
    img.onerror = () => reject(new Error('Browser could not decode uploaded image frames.'));
    img.src = fileUrl;
  });
}

async function inspectExternalVideo(
  fileUrl: string
): Promise<{
  widthPx: number;
  heightPx: number;
  durationSeconds: number;
  hasAudioTrack: boolean | null;
  audioNotice: string;
  decodedQr: string | null;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let settled = false;
    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };

    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(msg));
    };

    video.onerror = () => fail('Browser could not decode uploaded video stream.');

    video.onloadedmetadata = async () => {
      const widthPx = video.videoWidth || 0;
      const heightPx = video.videoHeight || 0;
      const durationSeconds = Number.isFinite(video.duration)
        ? Number(video.duration.toFixed(1))
        : 0;

      const anyVid = video as unknown as {
        mozHasAudio?: boolean;
        audioTracks?: { length: number };
        webkitAudioDecodedByteCount?: number;
      };
      let hasAudioTrack: boolean | null = null;
      let audioNotice =
        'Browser metadata check completed; manual audio loudness review recommended prior to broadcast.';
      if (typeof anyVid.mozHasAudio === 'boolean') {
        hasAudioTrack = anyVid.mozHasAudio;
        audioNotice = hasAudioTrack
          ? 'Audio track detected via browser decoder.'
          : 'No audio stream detected in video.';
      } else if (anyVid.audioTracks && typeof anyVid.audioTracks.length === 'number') {
        hasAudioTrack = anyVid.audioTracks.length > 0;
        audioNotice = hasAudioTrack
          ? `Detected ${anyVid.audioTracks.length} audio track(s).`
          : 'No audio track detected (silent video spot).';
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.min(widthPx || 1280, 1280));
      canvas.height = Math.max(
        1,
        Math.round((canvas.width * (heightPx || 720)) / Math.max(1, widthPx || 1280))
      );
      const ctx = canvas.getContext('2d');

      const sampleTimes = [
        Math.min(0.4, Math.max(0, durationSeconds * 0.1)),
        Math.max(0, durationSeconds * 0.5),
        Math.max(0, durationSeconds - 0.5),
      ];

      let decodedQr: string | null = null;
      for (const t of sampleTimes) {
        if (decodedQr) break;
        await new Promise<void>((resSeek) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              decodedQr = scanCanvasWithJsqr(ctx, canvas.width, canvas.height);
            }
            resSeek();
          };
          video.addEventListener('seeked', onSeeked, { once: true });
          try {
            video.currentTime = t;
          } catch {
            resSeek();
          }
        });
      }

      if (!settled) {
        settled = true;
        cleanup();
        resolve({
          widthPx,
          heightPx,
          durationSeconds,
          hasAudioTrack,
          audioNotice,
          decodedQr,
        });
      }
    };

    video.src = fileUrl;
  });
}

export function AdStudioView({
  currentUser,
  onNavigateAuth,
  onSummaryRefresh,
}: AdStudioProps) {
  const [creatives, setCreatives] = useState<AdCreativeRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [qrLinks, setQrLinks] = useState<QrLinkRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<AdStudioMode>('option_a_studio');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creativeTitle, setCreativeTitle] = useState('Autumn Home Savings Spot');
  const [campaignId, setCampaignId] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [displayDurationSeconds, setDisplayDurationSeconds] = useState(15);

  // Option A State
  const [optionA, setOptionA] = useState<OptionAComposition>(() => ({
    ...TEMPLATE_PRESETS[0].composition,
    elements: TEMPLATE_PRESETS[0].composition.elements.map((el) => ({ ...el })),
  }));
  const [selectedElementId, setSelectedElementId] = useState<string>('el_heading');
  const [showSafeGuide, setShowSafeGuide] = useState(true);
  const [qrPreviewDataUrl, setQrPreviewDataUrl] = useState<string>('');
  const [uploadingAssetRole, setUploadingAssetRole] = useState<string | null>(null);

  // Option B State
  const [optionB, setOptionB] = useState<OptionBUploadSpec | null>(null);
  const [inspectingUpload, setInspectingUpload] = useState(false);
  const [attachCampaignMap, setAttachCampaignMap] = useState<Record<string, string>>({});

  const [saveFeedback, setSaveFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [savingCreative, setSavingCreative] = useState(false);

  const hasInitializedQr = useRef(false);

  const loadAll = useCallback(async () => {
    if (!currentUser) {
      setCreatives([]);
      setCampaigns([]);
      setQrLinks([]);
      hasInitializedQr.current = false;
      return;
    }
    setLoading(true);
    try {
      const [crtRes, cmpRes, qrRes] = await Promise.all([
        fetch('/api/ad-creatives'),
        fetch('/api/campaigns'),
        fetch('/api/qr'),
      ]);
      if (crtRes.ok) {
        const data = await crtRes.json();
        setCreatives(data.items);
      }
      if (cmpRes.ok) {
        const cData = await cmpRes.json();
        setCampaigns(cData.items);
      }
      if (qrRes.ok) {
        const qData = await qrRes.json();
        setQrLinks(qData.items);
        if (!hasInitializedQr.current && qData.items.length > 0) {
          const activeFirst = qData.items.find((q: QrLinkRecord) => q.status === 'active');
          if (activeFirst) {
            setQrToken(activeFirst.token);
            hasInitializedQr.current = true;
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const activeQrRedirectUrl = useMemo(() => {
    const token = qrToken || 'edison-demo';
    return `${window.location.origin}/r/${token}`;
  }, [qrToken]);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(activeQrRedirectUrl, {
      errorCorrectionLevel: 'Q',
      margin: 2,
      width: 280,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrPreviewDataUrl(url);
      })
      .catch(() => {
        if (active) setQrPreviewDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [activeQrRedirectUrl]);

  // Live Guardrail computations for Option A
  const { safeZoneWarnings, contrastWarnings, contrastRatio } = useMemo(() => {
    const sw: string[] = [];
    const cw: string[] = [];
    const ratio = computeContrastRatio(optionA.textColor, optionA.backgroundColor);

    if (mode === 'option_a_studio') {
      if (ratio < 4.5 && (!optionA.backgroundImageUrl || optionA.scrimOpacity < 0.45)) {
        cw.push(
          `Text contrast vs background is ${ratio}:1 (below WCAG AA 4.5:1 TV readability target).`
        );
      }
      if (optionA.backgroundImageUrl && optionA.scrimOpacity < 0.3) {
        cw.push('Background photo scrim is below 30%; text over busy imagery may lose TV legibility.');
      }

      for (const el of optionA.elements) {
        if (!el.visible) continue;
        if (el.xPct < 5 || el.yPct < 5 || el.xPct + el.widthPct > 95 || el.yPct + el.heightPct > 95) {
          sw.push(
            `"${el.label}" (${el.xPct}%, ${el.yPct}%) extends outside the 5% TV title-safe overscan margin.`
          );
        }
        if (
          (el.kind === 'headline' ||
            el.kind === 'description' ||
            el.kind === 'price_value' ||
            el.kind === 'contact_info' ||
            el.kind === 'website_url' ||
            el.kind === 'cta_button') &&
          el.fontSizePx < 14
        ) {
          sw.push(`"${el.label}" font size (${el.fontSizePx}px) is below 14px TV legibility minimum.`);
        }
        if (el.kind === 'qr_block' && (el.widthPct < 10 || el.heightPct < 18)) {
          sw.push(
            `QR block (${el.widthPct}% × ${el.heightPct}%) is smaller than recommended 10-foot scan size.`
          );
        }
      }
      if (!qrToken) {
        sw.push('No validated /r/:token QR destination linked yet.');
      }
    } else if (optionB) {
      if (optionB.qrInspectionStatus === 'decoded_mismatch') {
        sw.push(
          `Existing QR payload (${optionB.decodedQrPayload}) does not match selected /r/${qrToken} destination.`
        );
      } else if (optionB.qrInspectionStatus === 'suspected_unreadable') {
        sw.push('Existing QR suspected unreadable; mandatory admin moderation review required.');
      } else if (optionB.qrInspectionStatus === 'none_found' && !optionB.qrOverlayConfirmed) {
        sw.push('No QR detected in media; confirm verified EDISON QR overlay before preview.');
      }
    }

    return { safeZoneWarnings: sw, contrastWarnings: cw, contrastRatio: ratio };
  }, [optionA, mode, qrToken, optionB]);

  const applyTemplatePreset = (presetId: StudioTemplateId) => {
    const preset = TEMPLATE_PRESETS.find((t) => t.id === presetId) ?? TEMPLATE_PRESETS[0];
    setOptionA((prev) => ({
      ...preset.composition,
      logoUrl: prev.logoUrl,
      productImageUrl: prev.productImageUrl,
      backgroundImageUrl: prev.backgroundImageUrl,
      elements: preset.composition.elements.map((el) => ({ ...el })),
    }));
    setSaveFeedback({ type: 'ok', text: `Loaded "${preset.label}" template layout.` });
  };

  const applyQrPlacementPreset = (preset: QrPlacementPreset) => {
    setOptionA((prev) => {
      const nextBox =
        preset === 'bottom_left'
          ? { xPct: 7, yPct: 58, widthPct: 16, heightPct: 30 }
          : preset === 'sidebar_right'
          ? { xPct: 75, yPct: 24, widthPct: 18, heightPct: 34 }
          : preset === 'bottom_right'
          ? { xPct: 76, yPct: 58, widthPct: 16, heightPct: 30 }
          : null;

      return {
        ...prev,
        qrPlacement: preset,
        elements: prev.elements.map((el) =>
          el.kind === 'qr_block' && nextBox ? { ...el, ...nextBox, visible: true } : el
        ),
      };
    });
  };

  const updateSelectedElement = (patch: Partial<CanvasElementLayout>) => {
    setOptionA((prev) => ({
      ...prev,
      qrPlacement:
        selectedElementId === 'el_qr' &&
        (patch.xPct !== undefined ||
          patch.yPct !== undefined ||
          patch.widthPct !== undefined ||
          patch.heightPct !== undefined)
          ? 'custom'
          : prev.qrPlacement,
      elements: prev.elements.map((el) =>
        el.id === selectedElementId ? { ...el, ...patch } : el
      ),
    }));
  };

  const handleUploadOptionAAsset = async (
    role: 'logo' | 'product' | 'background',
    file: File | undefined
  ) => {
    if (!file) return;
    setUploadingAssetRole(role);
    setSaveFeedback(null);
    try {
      const b64 = await readFileAsDataUrl(file);
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataBase64: b64, declaredKind: 'image' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveFeedback({ type: 'err', text: data.error || 'Image upload failed.' });
        return;
      }
      setOptionA((prev) => ({
        ...prev,
        logoUrl: role === 'logo' ? data.fileUrl : prev.logoUrl,
        productImageUrl: role === 'product' ? data.fileUrl : prev.productImageUrl,
        backgroundImageUrl: role === 'background' ? data.fileUrl : prev.backgroundImageUrl,
      }));
      setSaveFeedback({
        type: 'ok',
        text: `Validated ${role} upload stored (${Math.round(data.fileSizeBytes / 1024)} KB).`,
      });
    } catch (err) {
      setSaveFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Asset upload error.',
      });
    } finally {
      setUploadingAssetRole(null);
    }
  };

  const handleUploadOptionBMedia = async (file: File | undefined) => {
    if (!file) return;
    setInspectingUpload(true);
    setSaveFeedback(null);
    try {
      const b64 = await readFileAsDataUrl(file);
      const uploadRes = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataBase64: b64, declaredKind: 'any' }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setSaveFeedback({ type: 'err', text: uploadData.error || 'Media upload rejected.' });
        return;
      }

      const fileUrl = uploadData.fileUrl as string;
      const mediaKind = uploadData.mediaKind as 'image' | 'video';

      let widthPx = 0;
      let heightPx = 0;
      let durationSeconds: number | null = null;
      let hasAudioTrack: boolean | null = null;
      let audioNotice = 'Static image spot (no audio stream).';
      let decodedQr: string | null = null;

      if (mediaKind === 'image') {
        const imgResult = await inspectExternalImage(fileUrl);
        widthPx = imgResult.widthPx;
        heightPx = imgResult.heightPx;
        decodedQr = imgResult.decodedQr;
      } else {
        const vidResult = await inspectExternalVideo(fileUrl);
        widthPx = vidResult.widthPx;
        heightPx = vidResult.heightPx;
        durationSeconds = vidResult.durationSeconds;
        hasAudioTrack = vidResult.hasAudioTrack;
        audioNotice = vidResult.audioNotice;
        decodedQr = vidResult.decodedQr;
        if (durationSeconds >= 5 && durationSeconds <= 60) {
          setDisplayDurationSeconds(Math.round(durationSeconds));
        }
      }

      const ratio = heightPx > 0 ? widthPx / heightPx : 0;
      const aspectRatioValid = Math.abs(ratio - 16 / 9) <= 0.08;
      const aspectRatioLabel =
        aspectRatioValid
          ? `16:9 (${widthPx}×${heightPx})`
          : `Non-16:9 (${ratio.toFixed(2)}:1 · ${widthPx}×${heightPx})`;

      const validationErrors: string[] = [];
      const validationWarnings: string[] = [];

      if (widthPx < 1280 || heightPx < 720) {
        validationErrors.push(
          `Resolution ${widthPx}×${heightPx}px is below EDISON HD television minimum (1280×720px).`
        );
      }
      if (!aspectRatioValid) {
        validationErrors.push(
          `Aspect ratio ${ratio.toFixed(2)}:1 does not match required 16:9 Smart TV frame.`
        );
      }
      if (mediaKind === 'video' && durationSeconds !== null) {
        if (durationSeconds < 5 || durationSeconds > 60) {
          validationErrors.push(
            `Video duration (${durationSeconds}s) is outside permitted 5s–60s TV break bounds.`
          );
        }
      }

      let qrInspectionStatus: ExternalQrInspectionStatus = 'none_found';
      let requiresAdminReviewFlag = false;

      if (decodedQr) {
        const matches = doesDecodedQrMatchSelection(decodedQr, qrToken, qrLinks);
        qrInspectionStatus = matches ? 'decoded_matched' : 'decoded_mismatch';
        if (!matches) {
          requiresAdminReviewFlag = true;
          validationWarnings.push(
            `Embedded QR decoded "${decodedQr}" which mismatches selected /r/${qrToken || '(unset)'}. Campaign submission is blocked; existing QR will NEVER be silently overwritten.`
          );
        }
      } else {
        validationWarnings.push(
          'No QR code decoded in uploaded media. Either enable the verified EDISON QR overlay or flag below if an embedded QR exists.'
        );
      }

      setOptionB({
        mediaKind,
        fileUrl,
        originalFileName: file.name,
        mimeType: uploadData.mimeType,
        fileSizeBytes: uploadData.fileSizeBytes,
        widthPx,
        heightPx,
        aspectRatioLabel,
        aspectRatioValid,
        durationSeconds,
        hasAudioTrack,
        audioNotice,
        qrInspectionStatus,
        decodedQrPayload: decodedQr,
        qrOverlayConfirmed: false,
        qrOverlayCorner: 'bottom_right',
        requiresAdminReviewFlag,
        contentAttested: false,
        validationWarnings,
        validationErrors,
      });

      setSaveFeedback({
        type: validationErrors.length > 0 ? 'err' : 'ok',
        text:
          validationErrors.length > 0
            ? `Media stored but failed validation checks (${validationErrors.length} error).`
            : `Uploaded & inspected ${file.name} (${aspectRatioLabel}, QR status: ${qrInspectionStatus}).`,
      });
    } catch (err) {
      setSaveFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'External media inspection failed.',
      });
    } finally {
      setInspectingUpload(false);
    }
  };

  // Re-evaluate decoded QR match if qrToken changes after Option B upload
  useEffect(() => {
    if (mode !== 'option_b_upload' || !optionB || !optionB.decodedQrPayload) return;
    const matches = doesDecodedQrMatchSelection(optionB.decodedQrPayload, qrToken, qrLinks);
    const nextStatus: ExternalQrInspectionStatus = matches
      ? 'decoded_matched'
      : 'decoded_mismatch';
    if (nextStatus !== optionB.qrInspectionStatus) {
      setOptionB((prev) => {
        if (!prev) return null;
        const filteredWarnings = prev.validationWarnings.filter(
          (w) => !w.startsWith('Embedded QR decoded')
        );
        if (!matches) {
          filteredWarnings.push(
            `Embedded QR decoded "${prev.decodedQrPayload}" which mismatches selected /r/${qrToken || '(unset)'}. Campaign submission is blocked; existing QR will NEVER be silently overwritten.`
          );
        }
        return {
          ...prev,
          qrInspectionStatus: nextStatus,
          qrOverlayConfirmed: false,
          requiresAdminReviewFlag: nextStatus !== 'decoded_matched',
          validationWarnings: filteredWarnings,
        };
      });
    }
  }, [qrToken, qrLinks, mode, optionB]);

  const handleSaveCreative = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreative(true);
    setSaveFeedback(null);
    try {
      const endpoint = editingId ? `/api/ad-creatives/${editingId}` : '/api/ad-creatives';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: creativeTitle,
          campaignId: campaignId || null,
          qrToken: qrToken || null,
          mode,
          displayDurationSeconds,
          safeZoneWarnings,
          contrastWarnings,
          optionA: mode === 'option_a_studio' ? optionA : null,
          optionB: mode === 'option_b_upload' ? optionB : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveFeedback({ type: 'err', text: data.error || 'Unable to save creative.' });
        return;
      }
      setEditingId(data.item.id);
      setSaveFeedback({
        type: 'ok',
        text: `Saved creative "${data.item.title}" (${data.item.id}) · Status: ${data.item.status}.`,
      });
      await loadAll();
      await onSummaryRefresh();
    } catch (err) {
      setSaveFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Save request failed.',
      });
    } finally {
      setSavingCreative(false);
    }
  };

  const handleLoadCreative = (crt: AdCreativeRecord) => {
    setEditingId(crt.id);
    setCreativeTitle(crt.title);
    setCampaignId(crt.campaignId || '');
    setQrToken(crt.qrToken || '');
    setDisplayDurationSeconds(crt.displayDurationSeconds);
    setMode(crt.mode);
    if (crt.mode === 'option_a_studio' && crt.optionA) {
      setOptionA({
        ...crt.optionA,
        elements: crt.optionA.elements.map((el) => ({ ...el })),
      });
      setSelectedElementId(crt.optionA.elements[0]?.id ?? 'el_heading');
      setOptionB(null);
    } else if (crt.mode === 'option_b_upload' && crt.optionB) {
      setOptionB({ ...crt.optionB });
    }
    setSaveFeedback({ type: 'ok', text: `Loaded creative "${crt.title}" into Studio.` });
  };

  const handleAttachCreative = async (crtId: string) => {
    const targetCmp = attachCampaignMap[crtId];
    if (!targetCmp) {
      setSaveFeedback({ type: 'err', text: 'Select a target campaign before attaching.' });
      return;
    }
    const res = await fetch(`/api/ad-creatives/${crtId}/attach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: targetCmp }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSaveFeedback({ type: 'err', text: data.error || 'Attach failed.' });
      return;
    }
    setSaveFeedback({
      type: 'ok',
      text: `Attached creative ${crtId} to campaign ${targetCmp}.`,
    });
    await loadAll();
    await onSummaryRefresh();
  };

  const handleDeleteCreative = async (crtId: string) => {
    const res = await fetch(`/api/ad-creatives/${crtId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setSaveFeedback({ type: 'err', text: data.error || 'Delete failed.' });
      return;
    }
    if (editingId === crtId) setEditingId(null);
    setSaveFeedback({ type: 'ok', text: `Deleted ad creative ${crtId}.` });
    await loadAll();
    await onSummaryRefresh();
  };

  if (!currentUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4">
        <Palette className="w-8 h-8 text-slate-400 mx-auto" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Sign In to Open Advertisement Creation Studio
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            Option A guided 16:9 ad authoring and Option B external media upload with QR integrity inspection require an authenticated prototype session.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateAuth}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          Go to Auth & RBAC Console
        </button>
      </div>
    );
  }

  const selectedElement =
    optionA.elements.find((e) => e.id === selectedElementId) ?? optionA.elements[0];
  const sortedElements = [...optionA.elements].sort((a, b) => a.zIndex - b.zIndex);

  const reportText = [
    'EDISON — BLOCK 2.3 ADVERTISEMENT CREATION STUDIO REPORT',
    `Account: ${currentUser.email} (${currentUser.role})`,
    `Active Studio Mode: ${mode === 'option_a_studio' ? 'Option A · Guided Non-Designer Studio' : 'Option B · External Media Upload & QR Inspector'}`,
    `Active Creative Title: ${creativeTitle}${editingId ? ` (${editingId})` : ' (Unsaved Draft)'}`,
    `Linked QR Redirect: ${qrToken ? `/r/${qrToken}` : 'None'} | Duration: ${displayDurationSeconds}s`,
    mode === 'option_a_studio'
      ? `Option A Contrast Ratio: ${contrastRatio}:1 | Safe-Zone Warnings: ${safeZoneWarnings.length} | Contrast Warnings: ${contrastWarnings.length}`
      : `Option B Inspection: ${optionB ? `${optionB.aspectRatioLabel} · QR=${optionB.qrInspectionStatus} · Overlay=${optionB.qrOverlayConfirmed}` : 'No upload loaded'}`,
    `Saved Ad Creatives Accessible: ${creatives.length}`,
  ].join('\n');

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Advertisement Creation Studio
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Guided 16:9 television spot author (Option A) and externally produced media validator with strict non-overwrite QR integrity rules (Option B).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('option_a_studio')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'option_a_studio'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Option A · Guided Studio
            </button>
            <button
              type="button"
              onClick={() => setMode('option_b_upload')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'option_b_upload'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Option B · External Upload
            </button>
          </div>
          <button
            type="button"
            onClick={loadAll}
            aria-label="Refresh studio creatives"
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {saveFeedback && (
        <div
          role="status"
          className={`p-3.5 rounded-lg border text-xs ${
            saveFeedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {saveFeedback.text}
        </div>
      )}

      {mode === 'option_a_studio' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left: Structured Non-Designer Controls */}
          <form
            onSubmit={handleSaveCreative}
            className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-5"
          >
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">
                1. Template, Copy & Branding
              </span>
              <span className="text-xs font-mono text-slate-500">
                {editingId ? editingId : 'New Draft'}
              </span>
            </div>

            {/* Template Picker */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Purpose & Starter Template (Non-Blank Start)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {TEMPLATE_PRESETS.map((tpl) => {
                  const selected = optionA.templateId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplatePreset(tpl.id)}
                      className={`text-left px-2.5 py-2 rounded-md border text-xs transition-colors cursor-pointer ${
                        selected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <p className="font-semibold truncate">{tpl.label}</p>
                      <p
                        className={`text-[11px] truncate ${
                          selected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {tpl.categoryNote}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Creative Internal Title
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={creativeTitle}
                  onChange={(e) => setCreativeTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  TV Duration (5–60s)
                </label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={displayDurationSeconds}
                  onChange={(e) => setDisplayDurationSeconds(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs font-mono tabular-nums border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Validated QR Link (/r/:token)
                </label>
                <select
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                >
                  <option value="">(Unlinked Draft)</option>
                  {qrLinks.map((q) => (
                    <option key={q.token} value={q.token}>
                      /r/{q.token} · {q.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  QR Placement Preset
                </label>
                <select
                  value={optionA.qrPlacement}
                  onChange={(e) => applyQrPlacementPreset(e.target.value as QrPlacementPreset)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                >
                  <option value="bottom_right">Bottom-Right Safe Corner</option>
                  <option value="bottom_left">Bottom-Left Safe Corner</option>
                  <option value="sidebar_right">Dedicated Right Sidebar</option>
                  <option value="custom">Custom Position</option>
                </select>
              </div>
            </div>

            {/* Structured Copy */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Main Television Headline
                </label>
                <input
                  type="text"
                  required
                  value={optionA.heading}
                  onChange={(e) => setOptionA({ ...optionA, heading: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description / Supporting Copy
                </label>
                <textarea
                  rows={2}
                  value={optionA.description}
                  onChange={(e) => setOptionA({ ...optionA, description: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Promotional / Kicker Line
                  </label>
                  <input
                    type="text"
                    value={optionA.promoText}
                    onChange={(e) => setOptionA({ ...optionA, promoText: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Price / Offer / Salary Value
                  </label>
                  <input
                    type="text"
                    value={optionA.priceOrValue}
                    onChange={(e) => setOptionA({ ...optionA, priceOrValue: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Call to Action Label
                  </label>
                  <input
                    type="text"
                    value={optionA.callToAction}
                    onChange={(e) => setOptionA({ ...optionA, callToAction: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Contact Details
                  </label>
                  <input
                    type="text"
                    value={optionA.contactDetails}
                    onChange={(e) => setOptionA({ ...optionA, contactDetails: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Website Display Address
                </label>
                <input
                  type="text"
                  value={optionA.websiteAddress}
                  onChange={(e) => setOptionA({ ...optionA, websiteAddress: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Image Uploads */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-800">
                Brand & Media Assets (Magic-Byte Validated PNG/JPG/WebP)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    { key: 'logo', label: 'Logo', url: optionA.logoUrl },
                    { key: 'product', label: 'Product Photo', url: optionA.productImageUrl },
                    { key: 'background', label: 'Background Img', url: optionA.backgroundImageUrl },
                  ] as const
                ).map((slot) => (
                  <div
                    key={slot.key}
                    className="p-2.5 border border-slate-200 rounded-lg bg-slate-50 space-y-1.5"
                  >
                    <p className="text-[11px] font-medium text-slate-700">{slot.label}</p>
                    <label className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-white border border-slate-200 rounded cursor-pointer hover:bg-slate-100">
                      <Upload className="w-3 h-3" />
                      <span>{uploadingAssetRole === slot.key ? 'Uploading...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(e) =>
                          handleUploadOptionAAsset(slot.key, e.target.files?.[0])
                        }
                      />
                    </label>
                    {slot.url && (
                      <button
                        type="button"
                        onClick={() =>
                          setOptionA((prev) => ({
                            ...prev,
                            logoUrl: slot.key === 'logo' ? null : prev.logoUrl,
                            productImageUrl:
                              slot.key === 'product' ? null : prev.productImageUrl,
                            backgroundImageUrl:
                              slot.key === 'background' ? null : prev.backgroundImageUrl,
                          }))
                        }
                        className="block text-[11px] text-red-700 hover:underline cursor-pointer"
                      >
                        Clear {slot.label}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Colors & Scrim */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-800">
                  Background, Colours & Contrast Scrim
                </p>
                <span className="text-[11px] font-mono tabular-nums text-slate-600">
                  Contrast: {contrastRatio}:1
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Bg Start</label>
                  <input
                    type="color"
                    value={optionA.backgroundColor}
                    onChange={(e) =>
                      setOptionA({ ...optionA, backgroundColor: e.target.value })
                    }
                    className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Bg End</label>
                  <input
                    type="color"
                    value={optionA.gradientEndColor}
                    onChange={(e) =>
                      setOptionA({ ...optionA, gradientEndColor: e.target.value })
                    }
                    className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Accent CTA</label>
                  <input
                    type="color"
                    value={optionA.accentColor}
                    onChange={(e) => setOptionA({ ...optionA, accentColor: e.target.value })}
                    className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Typography</label>
                  <input
                    type="color"
                    value={optionA.textColor}
                    onChange={(e) => setOptionA({ ...optionA, textColor: e.target.value })}
                    className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optionA.useGradient}
                    onChange={(e) => setOptionA({ ...optionA, useGradient: e.target.checked })}
                  />
                  <span>Enable gradient backdrop</span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Scrim:</span>
                  <input
                    type="range"
                    min={0}
                    max={85}
                    value={Math.round(optionA.scrimOpacity * 100)}
                    onChange={(e) =>
                      setOptionA({ ...optionA, scrimOpacity: Number(e.target.value) / 100 })
                    }
                  />
                  <span className="font-mono tabular-nums w-9 text-right">
                    {Math.round(optionA.scrimOpacity * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="flex-1 w-full">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Link to Campaign (Optional)
                </label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                >
                  <option value="">Save Unlinked Creative</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.status})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={savingCreative}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {savingCreative ? 'Saving...' : editingId ? 'Update Creative' : 'Save Draft Creative'}
              </button>
            </div>
          </form>

          {/* Right: Live 16:9 Canvas & Element Geometry Inspector */}
          <div className="xl:col-span-7 space-y-5">
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    2. Live 16:9 Studio Canvas & Layer Inspector
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Click any element on the 16:9 frame or layer list to resize, reposition, or adjust z-order.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSafeGuide}
                    onChange={(e) => setShowSafeGuide(e.target.checked)}
                  />
                  <span>5% TV Title-Safe Guide</span>
                </label>
              </div>

              {/* 16:9 Live Composition Frame */}
              <div
                className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-300 select-none"
                style={{
                  background: optionA.useGradient
                    ? `linear-gradient(135deg, ${optionA.backgroundColor}, ${optionA.gradientEndColor})`
                    : optionA.backgroundColor,
                  color: optionA.textColor,
                }}
              >
                {optionA.backgroundImageUrl && (
                  <>
                    <img
                      src={optionA.backgroundImageUrl}
                      alt="Background artwork"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: `rgba(15, 23, 42, ${optionA.scrimOpacity})`,
                      }}
                    />
                  </>
                )}

                {showSafeGuide && (
                  <div
                    aria-hidden="true"
                    className="absolute pointer-events-none border border-dashed border-amber-400/80 z-30"
                    style={{ left: '5%', top: '5%', width: '90%', height: '90%' }}
                  />
                )}

                {sortedElements.map((el) => {
                  if (!el.visible) return null;
                  const isSel = el.id === selectedElementId;
                  return (
                    <button
                      key={el.id}
                      type="button"
                      onClick={() => setSelectedElementId(el.id)}
                      style={{
                        left: `${el.xPct}%`,
                        top: `${el.yPct}%`,
                        width: `${el.widthPct}%`,
                        height: `${el.heightPct}%`,
                        zIndex: el.zIndex,
                        fontSize: `${Math.max(9, Math.round(el.fontSizePx * 0.52))}px`,
                      }}
                      className={`absolute text-left overflow-hidden rounded transition-shadow cursor-pointer ${
                        isSel
                          ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-transparent'
                          : 'hover:ring-1 hover:ring-white/50'
                      }`}
                    >
                      {el.kind === 'logo' &&
                        (optionA.logoUrl ? (
                          <img
                            src={optionA.logoUrl}
                            alt="Advertiser logo"
                            className="w-full h-full object-contain object-left"
                          />
                        ) : (
                          <div className="w-full h-full border border-current/25 rounded flex items-center justify-center text-[10px] opacity-75">
                            LOGO SLOT
                          </div>
                        ))}

                      {el.kind === 'product_image' &&
                        (optionA.productImageUrl ? (
                          <img
                            src={optionA.productImageUrl}
                            alt="Featured product"
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-full border border-current/25 rounded flex items-center justify-center text-[10px] opacity-75 bg-black/15">
                            PRODUCT PHOTO
                          </div>
                        ))}

                      {el.kind === 'promo_badge' && (
                        <div
                          className="w-full h-full flex items-center font-semibold tracking-wide truncate"
                          style={{ color: optionA.accentColor }}
                        >
                          {optionA.promoText}
                        </div>
                      )}

                      {el.kind === 'headline' && (
                        <div className="w-full h-full font-bold leading-tight">
                          {optionA.heading}
                        </div>
                      )}

                      {el.kind === 'description' && (
                        <div className="w-full h-full opacity-90 leading-snug">
                          {optionA.description}
                        </div>
                      )}

                      {el.kind === 'price_value' && (
                        <div className="w-full h-full flex items-center font-bold tabular-nums">
                          {optionA.priceOrValue}
                        </div>
                      )}

                      {el.kind === 'cta_button' && (
                        <div
                          className="w-full h-full rounded flex items-center justify-center font-semibold text-white px-2 text-center"
                          style={{ backgroundColor: optionA.accentColor }}
                        >
                          {optionA.callToAction}
                        </div>
                      )}

                      {el.kind === 'contact_info' && (
                        <div className="w-full h-full flex items-center opacity-85 truncate">
                          {optionA.contactDetails}
                        </div>
                      )}

                      {el.kind === 'website_url' && (
                        <div className="w-full h-full flex items-center font-mono opacity-80 truncate">
                          {optionA.websiteAddress}
                        </div>
                      )}

                      {el.kind === 'qr_block' && (
                        <div className="w-full h-full bg-white text-slate-900 rounded p-1 flex flex-col items-center justify-center">
                          {qrPreviewDataUrl ? (
                            <img
                              src={qrPreviewDataUrl}
                              alt="QR overlay preview"
                              className="w-full h-[80%] object-contain"
                            />
                          ) : (
                            <QrCode className="w-6 h-6 text-slate-700" />
                          )}
                          <span className="text-[8px] font-mono font-semibold text-slate-700 truncate max-w-full">
                            {qrToken ? `/r/${qrToken}` : '/r/edison-demo'}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Guardrail Warnings */}
              {(safeZoneWarnings.length > 0 || contrastWarnings.length > 0) && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                    <span>Television Legibility & Safe-Zone Warnings</span>
                  </div>
                  {[...contrastWarnings, ...safeZoneWarnings].map((w, idx) => (
                    <p key={idx}>• {w}</p>
                  ))}
                </div>
              )}

              {/* Layer List + Geometry Manipulation */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-slate-200">
                <div className="md:col-span-5 space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Canvas Layers</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => applyTemplatePreset(optionA.templateId)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Layout</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-56 overflow-y-auto">
                    {sortedElements.map((el) => (
                      <button
                        key={el.id}
                        type="button"
                        onClick={() => setSelectedElementId(el.id)}
                        className={`w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between cursor-pointer ${
                          el.id === selectedElementId
                            ? 'bg-blue-50 text-blue-800 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{el.label}</span>
                        <span className="font-mono text-[11px] tabular-nums text-slate-500">
                          z{el.zIndex} · {el.visible ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-7 bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">
                      Layer Controls: {selectedElement?.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedElement({
                            zIndex: Math.min(25, (selectedElement?.zIndex ?? 1) + 1),
                          })
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-white border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                        <span>Bring Forward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedElement({
                            zIndex: Math.max(1, (selectedElement?.zIndex ?? 1) - 1),
                          })
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-white border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                        <span>Send Backward</span>
                      </button>
                    </div>
                  </div>

                  {selectedElement && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">
                          X Pos (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={95}
                          value={selectedElement.xPct}
                          onChange={(e) =>
                            updateSelectedElement({ xPct: Number(e.target.value) })
                          }
                          className="w-full px-2 py-1 font-mono tabular-nums bg-white border border-slate-200 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">
                          Y Pos (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={95}
                          value={selectedElement.yPct}
                          onChange={(e) =>
                            updateSelectedElement({ yPct: Number(e.target.value) })
                          }
                          className="w-full px-2 py-1 font-mono tabular-nums bg-white border border-slate-200 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">
                          Width (%)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={95}
                          value={selectedElement.widthPct}
                          onChange={(e) =>
                            updateSelectedElement({ widthPct: Number(e.target.value) })
                          }
                          className="w-full px-2 py-1 font-mono tabular-nums bg-white border border-slate-200 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">
                          Height (%)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={90}
                          value={selectedElement.heightPct}
                          onChange={(e) =>
                            updateSelectedElement({ heightPct: Number(e.target.value) })
                          }
                          className="w-full px-2 py-1 font-mono tabular-nums bg-white border border-slate-200 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">
                          Font Size (px)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={64}
                          value={selectedElement.fontSizePx}
                          onChange={(e) =>
                            updateSelectedElement({ fontSizePx: Number(e.target.value) })
                          }
                          className="w-full px-2 py-1 font-mono tabular-nums bg-white border border-slate-200 rounded"
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="inline-flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedElement.visible}
                            onChange={(e) =>
                              updateSelectedElement({ visible: e.target.checked })
                            }
                          />
                          <span>Visible Layer</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Option B External Upload & QR Integrity Scanner */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveCreative}
            className="xl:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-5"
          >
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Option B · External Image/Video Upload & QR Verification
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Validates magic bytes (PNG/JPG/WebP ≤ 8 MB, MP4/WebM ≤ 18 MB), 16:9 HD dimensions (≥ 1280×720), video duration (5s–60s), and scans frames with jsQR. Never silently overwrites an embedded QR.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Creative Title
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={creativeTitle}
                  onChange={(e) => setCreativeTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Expected Validated QR Link
                </label>
                <select
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                >
                  <option value="">(Select Expected /r/:token)</option>
                  {qrLinks.map((q) => (
                    <option key={q.token} value={q.token}>
                      /r/{q.token} · {q.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border border-dashed border-slate-300 rounded-lg bg-slate-50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">Upload 16:9 Creative Asset</p>
                  <p className="text-slate-600">Accepted: PNG, JPG, WebP, MP4, WebM</p>
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{inspectingUpload ? 'Inspecting Frames...' : 'Select & Inspect File'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                    className="sr-only"
                    onChange={(e) => handleUploadOptionBMedia(e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>

            {optionB && (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 inline-flex items-center gap-1.5">
                      {optionB.mediaKind === 'video' ? (
                        <FileVideo className="w-4 h-4 text-blue-600" />
                      ) : (
                        <FileImage className="w-4 h-4 text-blue-600" />
                      )}
                      <span>{optionB.originalFileName}</span>
                    </span>
                    <span className="font-mono text-slate-600 tabular-nums">
                      {optionB.mimeType} · {Math.round(optionB.fileSizeBytes / 1024)} KB
                    </span>
                  </div>
                  <p className="font-mono text-slate-700 tabular-nums">
                    Dimensions: {optionB.aspectRatioLabel}
                    {optionB.durationSeconds !== null
                      ? ` · Duration: ${optionB.durationSeconds}s`
                      : ''}
                  </p>
                  <p className="text-slate-600">Audio check: {optionB.audioNotice}</p>
                </div>

                {optionB.validationErrors.length > 0 && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 space-y-1">
                    <p className="font-semibold">Blocking Media Validation Errors</p>
                    {optionB.validationErrors.map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                )}

                {/* 3-Case QR Policy Box */}
                <div
                  className={`p-4 rounded-lg border text-xs space-y-3 ${
                    optionB.qrInspectionStatus === 'decoded_matched'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : optionB.qrInspectionStatus === 'none_found'
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold inline-flex items-center gap-1.5">
                      {optionB.qrInspectionStatus === 'decoded_matched' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <ShieldAlert className="w-4 h-4" />
                      )}
                      <span>QR Integrity Result: {optionB.qrInspectionStatus}</span>
                    </span>
                  </div>

                  {optionB.decodedQrPayload && (
                    <p className="font-mono break-all">
                      Decoded Embedded QR: {optionB.decodedQrPayload}
                    </p>
                  )}

                  {optionB.qrInspectionStatus === 'none_found' && (
                    <div className="space-y-2.5">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={optionB.qrOverlayConfirmed}
                          onChange={(e) =>
                            setOptionB({
                              ...optionB,
                              qrOverlayConfirmed: e.target.checked,
                            })
                          }
                          className="mt-0.5"
                        />
                        <span>
                          No existing QR detected. Overlay EDISON verified QR (
                          <span className="font-mono">/r/{qrToken || 'unset'}</span>) in the safe corner below.
                        </span>
                      </label>

                      {optionB.qrOverlayConfirmed && (
                        <div className="flex items-center gap-3 pl-5">
                          <span>Corner:</span>
                          <select
                            value={optionB.qrOverlayCorner}
                            onChange={(e) =>
                              setOptionB({
                                ...optionB,
                                qrOverlayCorner: e.target.value as 'bottom_right' | 'bottom_left',
                              })
                            }
                            className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                          >
                            <option value="bottom_right">Bottom-Right Safe Corner</option>
                            <option value="bottom_left">Bottom-Left Safe Corner</option>
                          </select>
                        </div>
                      )}

                      <label className="flex items-start gap-2 pt-2 border-t border-slate-200 text-amber-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() =>
                            setOptionB({
                              ...optionB,
                              qrInspectionStatus: 'suspected_unreadable',
                              qrOverlayConfirmed: false,
                              requiresAdminReviewFlag: true,
                            })
                          }
                          className="mt-0.5"
                        />
                        <span>
                          Asset actually contains a small, skewed, or stylised QR code that automated scanning missed — flag for mandatory Admin Review (blocks overlay).
                        </span>
                      </label>
                    </div>
                  )}

                  {optionB.qrInspectionStatus === 'suspected_unreadable' && (
                    <div className="space-y-2">
                      <p>
                        Flagged as <strong>suspected_unreadable</strong>. Mandatory Admin Review is required and QR overlay is disabled to enforce EDISON non-overwrite policy.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setOptionB({
                            ...optionB,
                            qrInspectionStatus: 'none_found',
                            requiresAdminReviewFlag: false,
                          })
                        }
                        className="text-xs underline font-medium cursor-pointer"
                      >
                        Reset to No QR Found (if file has no embedded QR)
                      </button>
                    </div>
                  )}

                  {optionB.qrInspectionStatus === 'decoded_mismatch' && (
                    <p>
                      Decoded QR payload does not match your selected <span className="font-mono">/r/{qrToken || '(none)'}</span> redirect link or destination URL. Update your asset or select the matching verified QR link before campaign submission.
                    </p>
                  )}
                </div>

                <label className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optionB.contentAttested}
                    onChange={(e) =>
                      setOptionB({ ...optionB, contentAttested: e.target.checked })
                    }
                    className="mt-0.5"
                  />
                  <span>
                    I attest that the advertiser holds full broadcast/copyright permissions and that all claims and destination URLs comply with EDISON standards.
                  </span>
                </label>

                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 border-t border-slate-200">
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Link to Campaign (Optional)
                    </label>
                    <select
                      value={campaignId}
                      onChange={(e) => setCampaignId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="">Save Unlinked Creative</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.status})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={savingCreative || optionB.validationErrors.length > 0 || !optionB.contentAttested}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {savingCreative ? 'Saving...' : 'Save External Creative'}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Option B 16:9 Verification Preview */}
          <div className="xl:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Uploaded Creative 16:9 Inspection Frame
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Displays uploaded media inside a 16:9 television aspect frame with optional safe QR overlay.
                </p>
              </div>
              <Eye className="w-4 h-4 text-slate-400" />
            </div>

            {optionB ? (
              <div className="relative w-full aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-300">
                {optionB.mediaKind === 'video' ? (
                  <video
                    src={optionB.fileUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={optionB.fileUrl}
                    alt={optionB.originalFileName}
                    className="w-full h-full object-contain"
                  />
                )}

                {optionB.qrInspectionStatus === 'none_found' &&
                  optionB.qrOverlayConfirmed &&
                  qrToken && (
                    <div
                      className={`absolute bottom-[6%] ${
                        optionB.qrOverlayCorner === 'bottom_left' ? 'left-[5%]' : 'right-[5%]'
                      } bg-white p-1.5 rounded-lg border border-slate-300 shadow-sm flex flex-col items-center w-[17%]`}
                    >
                      <QrCodePreview
                        value={activeQrRedirectUrl}
                        size={76}
                        label={`EDISON overlay /r/${qrToken}`}
                      />
                      <span className="mt-1 text-[9px] font-mono font-semibold text-slate-800 truncate max-w-full">
                        /r/{qrToken}
                      </span>
                    </div>
                  )}
              </div>
            ) : (
              <div className="w-full aspect-video rounded-lg border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-2">
                <Upload className="w-7 h-7 text-slate-400" />
                <p className="text-sm font-medium text-slate-800">No External Asset Uploaded</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Select a 16:9 PNG, JPG, WebP, MP4, or WebM file on the left to inspect pixel dimensions, aspect ratio, duration, and existing QR codes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Persisted Ad Creatives Registry */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Saved Advertisement Creatives Ledger
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Load any saved Option A or Option B creative back into the studio, or attach it directly to a campaign.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-600">
            {creatives.length} stored
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5 font-semibold text-slate-700">Creative</th>
                <th className="px-3.5 py-2.5 font-semibold text-slate-700">Mode & Duration</th>
                <th className="px-3.5 py-2.5 font-semibold text-slate-700">QR & Warnings</th>
                <th className="px-3.5 py-2.5 font-semibold text-slate-700">Status</th>
                <th className="px-3.5 py-2.5 font-semibold text-slate-700">Attach to Campaign</th>
                <th className="px-3.5 py-2.5 font-semibold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {creatives.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No ad creatives saved for this account yet. Save a creative from Option A or Option B above.
                  </td>
                </tr>
              ) : (
                creatives.map((crt) => (
                  <tr key={crt.id} className="hover:bg-slate-50/70">
                    <td className="px-3.5 py-3 align-top">
                      <p className="font-semibold text-slate-900">{crt.title}</p>
                      <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                        {crt.id} · {crt.campaignId ? `Linked: ${crt.campaignId}` : 'Unlinked'}
                      </p>
                    </td>
                    <td className="px-3.5 py-3 align-top font-mono tabular-nums text-slate-700">
                      <p>{crt.mode === 'option_a_studio' ? 'Option A Studio' : 'Option B Upload'}</p>
                      <p className="text-slate-500">{crt.displayDurationSeconds}s spot</p>
                    </td>
                    <td className="px-3.5 py-3 align-top">
                      <p className="font-mono text-slate-800">
                        {crt.qrToken ? `/r/${crt.qrToken}` : 'No QR'}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {crt.safeZoneWarnings.length + crt.contrastWarnings.length} warnings
                        {crt.optionB ? ` · QR: ${crt.optionB.qrInspectionStatus}` : ''}
                      </p>
                    </td>
                    <td className="px-3.5 py-3 align-top font-mono whitespace-nowrap">
                      <span
                        className={
                          crt.status === 'ready_for_preview'
                            ? 'text-emerald-700 font-semibold'
                            : crt.status === 'flagged_for_review'
                            ? 'text-red-700 font-semibold'
                            : 'text-slate-600'
                        }
                      >
                        {crt.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={attachCampaignMap[crt.id] ?? crt.campaignId ?? ''}
                          onChange={(e) =>
                            setAttachCampaignMap({
                              ...attachCampaignMap,
                              [crt.id]: e.target.value,
                            })
                          }
                          aria-label={`Select campaign for ${crt.title}`}
                          className="px-2 py-1 text-[11px] bg-white border border-slate-200 rounded max-w-[160px]"
                        >
                          <option value="">Select campaign...</option>
                          {campaigns.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAttachCreative(crt.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-slate-900 text-white rounded hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>Attach</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 align-top text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => handleLoadCreative(crt)}
                        className="text-blue-700 hover:underline font-medium cursor-pointer"
                      >
                        Load in Studio
                      </button>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCreative(crt.id)}
                        aria-label={`Delete creative ${crt.title}`}
                        className="inline-flex items-center gap-1 text-red-700 hover:underline font-medium cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <CopyReportFooter
          reportText={reportText}
          reportTitle="Block 2.3 Advertisement Creation Studio Report"
        />
      </div>
    </div>
  );
}
