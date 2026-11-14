import { useState } from 'react';
import { Check, Copy, AlertTriangle } from 'lucide-react';

interface CopyReportFooterProps {
  reportText: string;
  reportTitle: string;
}

export function CopyReportFooter({ reportText, reportTitle }: CopyReportFooterProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleCopy = async () => {
    setErrorMessage('');
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(reportText);
        setStatus('copied');
        window.setTimeout(() => setStatus('idle'), 2500);
        return;
      }
      throw new Error('Clipboard API unavailable in non-secure context');
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = reportText;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const succeeded = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!succeeded) {
          throw new Error('Browser blocked execCommand copy');
        }
        setStatus('copied');
        window.setTimeout(() => setStatus('idle'), 2500);
      } catch (err) {
        setStatus('error');
        setErrorMessage(
          err instanceof Error
            ? `Clipboard access failed (${err.message}). Select the report text above and copy manually.`
            : 'Clipboard access failed. Select the report text above and copy manually.'
        );
      }
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="text-xs text-slate-500">
        <span>Complete report ready</span>
        <span className="mx-2" aria-hidden="true">·</span>
        <span className="font-mono tabular-nums">{reportText.length.toLocaleString()} chars</span>
        <span className="mx-2" aria-hidden="true">·</span>
        <span>{reportTitle}</span>
      </div>

      <div className="flex flex-col items-start sm:items-end gap-1.5">
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy full ${reportTitle}`}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
            status === 'copied'
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : status === 'error'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {status === 'copied' ? (
            <>
              <Check className="w-4 h-4 shrink-0" />
              <span>Copied</span>
            </>
          ) : status === 'error' ? (
            <>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Copy Failed</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 shrink-0" />
              <span>Copy Report</span>
            </>
          )}
        </button>

        {status === 'error' && errorMessage && (
          <p role="alert" className="text-xs text-red-700 max-w-md sm:text-right">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
