import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || "Something unexpected happened.",
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("Supremo Barber render error", error, errorInfo);
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FBF7EF] px-6 py-12">
        <section
          role="alert"
          className="w-full max-w-lg rounded-3xl border border-[#E8DCC8] bg-white p-8 text-center shadow-xl"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DB9D47]/15 text-2xl">
            ✂️
          </div>
          <h1 className="text-2xl font-bold text-[#5C4A3A]">We hit a snag</h1>
          <p className="mt-3 text-[#87765E]">
            Supremo Barber is still here. Refresh this view to continue your booking or dashboard session.
          </p>
          {import.meta.env.DEV && this.state.errorMessage && (
            <p className="mt-4 rounded-xl bg-[#FBF7EF] p-3 text-left text-xs text-[#87765E]">
              {this.state.errorMessage}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-6 rounded-xl bg-[#DB9D47] px-5 py-3 font-semibold text-white shadow-lg shadow-[#DB9D47]/25 transition-colors hover:bg-[#C56E33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DB9D47] focus-visible:ring-offset-2"
          >
            Try again
          </button>
        </section>
      </main>
    );
  }
}
