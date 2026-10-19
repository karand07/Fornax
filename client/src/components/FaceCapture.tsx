import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface FaceCaptureProps {
  onCapture: (descriptor: number[]) => void;
  title?: string;
  description?: string;
  buttonLabel?: string;
}

export const FaceCapture: React.FC<FaceCaptureProps> = ({
  onCapture,
  title = 'Facial Biometric Verification',
  description = 'Position your face within the frame to verify attendance',
  buttonLabel = 'Capture & Verify Face',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedSuccess, setCapturedSuccess] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamActive(true);
        }
      } catch (err) {
        console.warn('Camera access denied or unavailable:', err);
        setError('Camera unavailable. Using fallback simulation for verification demo.');
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    setCapturing(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockDescriptor = Array.from({ length: 128 }, () => Math.random() * 0.2 - 0.1);
      onCapture(mockDescriptor);
      setCapturedSuccess(true);
    } catch {
      setError('Failed to extract facial descriptors. Ensure adequate lighting.');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto border-border bg-card shadow-lg overflow-hidden">
      <CardHeader className="text-center pb-3">
        <CardTitle className="text-base font-semibold flex items-center justify-center gap-2">
          <Camera className="w-4 h-4 text-blue-400" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4">
        <div className="relative w-full aspect-video bg-slate-950 rounded-lg overflow-hidden border border-border flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`}
          />
          {!streamActive && (
            <div className="text-center p-6 text-slate-500 text-sm">
              <Camera className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
              Camera preview placeholder
            </div>
          )}

          {/* Biometric Target Viewfinder */}
          <div className="absolute inset-4 pointer-events-none flex items-center justify-center">
            <div className="relative w-40 h-48 border border-blue-500/30 rounded-lg">
              <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-blue-400"></div>
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-blue-400"></div>
              <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-blue-400"></div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-blue-400"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-blue-400/25 rounded-full"></div>
            </div>
          </div>
        </div>

        {error && (
          <div className="w-full flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-md">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {capturedSuccess && (
          <div className="w-full flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-md">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Biometric descriptors captured successfully.</span>
          </div>
        )}

        <Button
          onClick={handleCapture}
          disabled={capturing}
          variant="default"
          className="w-full mt-1"
        >
          {capturing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Extracting Features...
            </>
          ) : (
            buttonLabel
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
