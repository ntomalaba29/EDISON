import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodePreviewProps {
  value: string;
  size?: number;
  label?: string;
}

export function QrCodePreview({ value, size = 180, label = 'EDISON QR Code' }: QrCodePreviewProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let active = true;
    setError('');
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'Q',
      margin: 4,
      width: size * 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to encode QR code');
        }
      });

    return () => {
      active = false;
    };
  }, [value, size]);

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className="border border-red-200 bg-red-50 rounded-lg flex items-center justify-center p-3 text-center text-xs text-red-700"
      >
        {error}
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="border border-slate-200 bg-slate-100 rounded-lg animate-pulse"
      />
    );
  }

  return (
    <div className="inline-block bg-white border border-slate-200 rounded-lg p-2">
      <img
        src={dataUrl}
        alt={label}
        width={size}
        height={size}
        className="block rounded"
      />
    </div>
  );
}
