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
      return (
        <div className="p-8 text-red-500 font-mono text-sm bg-red-50">
          <h2 className="font-bold text-lg mb-4">Application Error</h2>
          <pre className="whitespace-pre-wrap">{this.state.error?.message}</pre>
          <pre className="mt-4 opacity-75">{this.state.error?.stack}</pre>
          <button 
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
