import {
  Component,
  StrictMode,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';

interface DevErrorBoundaryProps {
  children: ReactNode;
}

interface DevErrorBoundaryState {
  error: Error | null;
}

class DevErrorBoundary extends Component<
  DevErrorBoundaryProps,
  DevErrorBoundaryState
> {
  state: DevErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): DevErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SystemHub runtime error:', error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#050816] px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/30 bg-red-950/20 p-6 shadow-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-300">
            Runtime Error
          </p>
          <h1 className="mt-4 text-2xl font-black text-white">
            แอปเกิดข้อผิดพลาดระหว่างเริ่มต้นทำงาน
          </h1>
          <p className="mt-3 text-sm text-red-100/80">
            คัดลอกข้อความด้านล่างแล้วส่งกลับมาได้เลย เดี๋ยวผมไล่ให้ต่อทันที
          </p>
          <pre className="mt-6 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-red-100 whitespace-pre-wrap">
            {this.state.error.stack ?? this.state.error.message}
          </pre>
        </div>
      </div>
    );
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('ไม่พบ element ที่มี id เป็น root');
}

const root = createRoot(rootElement);

const renderStartupError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.stack ?? error.message
      : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุระหว่างโหลดแอป';

  root.render(
    <div className="min-h-screen bg-[#050816] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/30 bg-red-950/20 p-6 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-300">
          Startup Error
        </p>
        <h1 className="mt-4 text-2xl font-black text-white">
          แอปโหลดไม่สำเร็จ
        </h1>
        <p className="mt-3 text-sm text-red-100/80">
          คัดลอกข้อความด้านล่างแล้วส่งกลับมาได้เลย เดี๋ยวผมช่วยแก้ต่อให้
        </p>
        <pre className="mt-6 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-red-100 whitespace-pre-wrap">
          {message}
        </pre>
      </div>
    </div>,
  );
};

void import('./App.tsx')
  .then(({ default: App }) => {
    root.render(
      <StrictMode>
        <DevErrorBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </DevErrorBoundary>
      </StrictMode>,
    );
  })
  .catch((error) => {
    console.error('SystemHub startup error:', error);
    renderStartupError(error);
  });
