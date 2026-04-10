'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useWebGPU } from '@/hooks/use-web-gpu';
import { DEFAULT_QR_CONTENT } from '@/lib/constants';

export default function CherryBlossomQRCode() {
  const [qrContent, setQrContent] = useState(DEFAULT_QR_CONTENT);
  const [isFlat, setIsFlat] = useState(false);
  const [gpuSupported, setGpuSupported] = useState<boolean | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 520 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isFlatRef = useRef(false);

  // Measure the canvas wrapper area
  useEffect(() => {
    const measure = () => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Check GPU support on first mount
  useEffect(() => {
    setGpuSupported(!!((navigator as unknown as { gpu?: unknown }).gpu));
  }, []);

  const toggleFlat = useCallback(() => {
    isFlatRef.current = !isFlatRef.current;
    setIsFlat(isFlatRef.current);
  }, []);

  useWebGPU({
    canvasRef,
    canvasWidth: dimensions.width,
    canvasHeight: dimensions.height,
    qrContent,
    isFlat: isFlatRef,
  });

  return (
    <main
      className="relative flex flex-col items-center justify-between w-full h-screen overflow-hidden"
      style={{ backgroundColor: '#f7f7f7' }}
    >
      {/* WebGPU Not Supported Warning */}
      {gpuSupported === false && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#f7f7f7]">
          <div className="text-center px-8 py-10 rounded-2xl bg-white shadow-xl max-w-sm mx-4">
            <div className="text-5xl mb-4">🌸</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              WebGPU Required
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              This animation uses WebGPU for rendering. Please open this page in{' '}
              <strong>Chrome 113+</strong>, <strong>Edge 113+</strong>, or{' '}
              <strong>Safari 17+</strong>.
            </p>
          </div>
        </div>
      )}

      {/* URL Input — top */}
      <div className="w-full px-4 pt-5 pb-3 flex-shrink-0" style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div className="relative">
          {/* Link icon */}
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#aaa"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>

          <input
            id="qr-url-input"
            type="url"
            value={qrContent}
            onChange={(e) => setQrContent(e.target.value)}
            placeholder="https://enzo.fyi"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full pl-10 pr-10 py-3.5 rounded-2xl bg-white text-gray-800
                       outline-none focus:ring-2 focus:ring-rose-300 transition-all
                       placeholder-gray-400"
            style={{
              fontSize: '16px',
              fontWeight: 400,
              letterSpacing: '0.2px',
              border: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          />

          {/* Clear button */}
          {qrContent && (
            <button
              onClick={() => setQrContent('')}
              className="absolute inset-y-0 right-3 flex items-center px-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear URL input"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-2 select-none">
          Type any URL to generate • Click the canvas to toggle flat / 3D view
        </p>
      </div>

      {/* Canvas Area */}
      <div ref={wrapperRef} className="flex-1 w-full relative min-h-0">
        <canvas
          ref={canvasRef}
          onClick={toggleFlat}
          className="w-full h-full cursor-pointer"
          style={{ display: 'block', touchAction: 'none' }}
          aria-label="Cherry blossom tree QR code – click to toggle flat view"
        />

        {/* Toggle hint badge */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2
                     px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-sm shadow-sm
                     text-xs text-gray-500 pointer-events-none select-none transition-all duration-500"
        >
          <span className="text-sm">{isFlat ? '🔍' : '🌸'}</span>
          <span>{isFlat ? 'Flat view — scannable QR' : 'Click to reveal QR code'}</span>
        </div>
      </div>
    </main>
  );
}
