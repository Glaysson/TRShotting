import React from 'react';
import Login from './components/Login';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  state: { hasError: boolean, error: any };
  props: { children: React.ReactNode };

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-red-500/20 p-8 rounded-2xl max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Algo deu errado</h2>
            <p className="text-gray-400 mb-6">Ocorreu um erro inesperado no sistema.</p>
            <pre className="bg-black/50 p-4 rounded-xl text-xs text-left overflow-auto max-h-40 mb-6 border border-[#222]">
              {this.state.error?.message || JSON.stringify(this.state.error)}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-white text-black rounded-xl font-bold"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Login />
    </ErrorBoundary>
  );
}
