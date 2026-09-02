import React from 'react';

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes('dynamically imported module');
      return (
        <div className="min-h-screen bg-[var(--bg,#0a0a0a)] text-[var(--text,#ededed)] flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full border border-[var(--border,#262626)] bg-[var(--surface,#141414)] rounded-xl p-8 shadow-2xl">
            <h2 className="text-xl font-semibold mb-2">
              {isChunkError ? 'New Version Available' : 'Application Error'}
            </h2>
            <p className="text-sm text-[var(--text-muted,#888)] mb-6">
              {isChunkError 
                ? 'SeqCraft has been updated with new improvements. Please reload to use the latest version.'
                : (this.state.error?.message || 'An unexpected error occurred.')}
            </p>
            <button 
              className="px-6 py-2.5 bg-[var(--accent,#3b82f6)] hover:bg-[var(--accent-hover,#2563eb)] text-white font-medium rounded-lg transition-colors cursor-pointer text-sm"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.sessionStorage.clear();
                  window.location.reload();
                }
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
