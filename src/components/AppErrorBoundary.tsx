import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * Root React ErrorBoundary for EDISON.
 * Catches unexpected client render errors without leaking raw component traces
 * to the browser view and provides a deterministic recovery path.
 */
export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.error('[EDISON UI ErrorBoundary]', error.message);
  }

  private handleRecover = () => {
    this.setState({ hasError: false });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h1 className="text-lg font-semibold text-white">
                EDISON Interface Recovery
              </h1>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              An unexpected display error interrupted this view. Persisted server state in
              EDISON was not modified. Reload the interface to resume safely.
            </p>
            <button
              type="button"
              onClick={this.handleRecover}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Reload EDISON Console
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
