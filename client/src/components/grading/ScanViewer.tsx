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
      className={`flex flex-col h-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs ${
        className || ''
      }`}
    >
      {/* Control bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-700">
        <span className="font-semibold text-slate-800">Handwritten Scan</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-mono mr-1">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={loading || !!error || zoom <= 0.5}
            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
            className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            title="Fit to view"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Fit
          </Button>
        </div>
      </div>

      {/* Image Pan/Scroll Container */}
      <div className="relative flex-1 overflow-auto p-4 bg-slate-100/60 flex items-center justify-center min-h-[300px]">
        {loading && (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Loading scan image...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-2 text-rose-600 text-center max-w-xs">
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
              className="max-w-full rounded shadow-md border border-slate-200 object-contain select-none bg-white"
              draggable={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};
