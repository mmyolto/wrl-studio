import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Last-resort screen if something unexpected breaks while rendering. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unexpected error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-extrabold text-stone-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-stone-500">
            The page hit an unexpected problem. Reloading usually fixes it — your saved data is safe.
          </p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-stone-50 p-3 text-left text-xs text-stone-500">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 h-10 rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
