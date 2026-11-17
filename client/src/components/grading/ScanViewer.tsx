import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Loader2, AlertCircle } from 'lucide-react';

interface ScanViewerProps {
  submissionId: string;
  className?: string;
}

export const ScanViewer: React.FC<ScanViewerProps> = ({ submissionId, className }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    setLoading(true);
    setError(null);
    setZoom(1);

    api
      .get(`/submissions/${submissionId}/scan`, { responseType: 'blob' })
      .then((res: { data: Blob }) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(res.data);
        setBlobUrl(objectUrl);
        setLoading(false);
      })
      .catch((err: any) => {
        if (!active) return;
        const msg = err.response?.data?.error || 'Failed to load handwritten scan';
        setError(msg);
        setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [submissionId]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3, Math.round((prev + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, Math.round((prev - 0.25) * 100) / 100));
  };

  const handleFit = () => {
    setZoom(1);
  };

  return (
    <div
      className={`flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden ${
        className || ''
      }`}
    >
      {/* Control bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/70 border-b border-slate-800 text-xs text-slate-300">
        <span className="font-medium text-slate-400">Handwritten Scan</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-mono mr-1">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={loading || !!error || zoom <= 0.5}
            className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={loading || !!error || zoom >= 3}
            className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFit}
            disabled={loading || !!error}
            className="h-7 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800"
            title="Fit to view"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Fit
          </Button>
        </div>
      </div>

      {/* Image Pan/Scroll Container */}
      <div className="relative flex-1 overflow-auto p-4 bg-slate-950/40 flex items-center justify-center min-h-[300px]">
        {loading && (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="text-xs">Loading scan image...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-2 text-red-400 text-center max-w-xs">
            <AlertCircle className="w-6 h-6" />
            <span className="text-xs">{error}</span>
          </div>
        )}

        {!loading && !error && blobUrl && (
          <div
            className="transition-transform duration-100 ease-out origin-top-left"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            <img
              src={blobUrl}
              alt="Handwritten student scan"
              className="max-w-full rounded shadow-md border border-slate-700/60 object-contain select-none"
              draggable={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};
