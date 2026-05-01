import React, { Component } from 'react';
import { XCircle } from 'lucide-react';

export class ErrorBoundary extends Component<any, any> {
  state = { hasError: false, error: null };

  constructor(props: any) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(error?.message || "");
        if (parsed.error) errorMessage = `Firestore Error: ${parsed.error}`;
      } catch {
        errorMessage = error?.message || errorMessage;
      }

      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
          <XCircle size={48} className="text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Application Error</h2>
          <p className="text-gray-400 max-w-md mb-6">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
