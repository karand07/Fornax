import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  QrCode,
  ScanLine,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Zap,
  ZapOff,
} from 'lucide-react';

export interface ParsedQrData {
  raw: string;
  sessionId?: string;
  qrCodeToken?: string;
}

export function parseQrData(data: string): ParsedQrData {
  const trimmed = data.trim();

  // 1. Try parsing as JSON (standard in Fornax LiveAttendancePage)
  try {
    const json = JSON.parse(trimmed);
    if (typeof json === 'object' && json !== null) {
      return {
        raw: trimmed,
        sessionId: json.sessionId || json.session_id || json.id || undefined,
        qrCodeToken:
          json.qrCodeToken ||
          json.token ||
          json.code ||
          json.passcode ||
          undefined,
      };
    }
  } catch {
    // Not JSON, continue to next parsers
  }

  // 2. Try parsing as full URL
  try {
    const url = new URL(trimmed);
    const params = url.searchParams;
    const sessionId =
      params.get('session') || params.get('sessionId') || undefined;
    const qrCodeToken =
      params.get('qrCodeToken') ||
      params.get('token') ||
      params.get('code') ||
      undefined;

    if (sessionId || qrCodeToken) {
      return { raw: trimmed, sessionId, qrCodeToken };
    }
  } catch {
    // Not a full URL
  }

  // 3. Try parsing query string if present
  if (trimmed.includes('?')) {
    try {
      const queryString = trimmed.slice(trimmed.indexOf('?'));
      const params = new URLSearchParams(queryString);
      const sessionId =
        params.get('session') || params.get('sessionId') || undefined;
      const qrCodeToken =
        params.get('qrCodeToken') ||
        params.get('token') ||
        params.get('code') ||
        undefined;

      if (sessionId || qrCodeToken) {
        return { raw: trimmed, sessionId, qrCodeToken };
      }
    } catch {
      // Ignore
    }
  }

  // 4. UUID check (Session ID only)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed)) {
    return { raw: trimmed, sessionId: trimmed };
  }

  // 5. Fallback: treat as QR passcode / token
  return { raw: trimmed, qrCodeToken: trimmed };
}

function playScanChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    // Audio playback not permitted without user gesture or unsupported
  }
}

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (data: ParsedQrData) => void;
}

export const QrScannerDialog: React.FC<QrScannerDialogProps> = ({
  open,
  onOpenChange,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedData, setDetectedData] = useState<ParsedQrData | null>(null);

  // Safely stop all camera tracks
  const stopStream = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  // Check available cameras
  const checkDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setHasMultipleCameras(videoInputs.length > 1);
    } catch {
      // ignore
    }
  }, []);

  // Toggle Torch/Flashlight if supported
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch control not supported:', err);
    }
  }, [torchOn]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    stopStream();
    setCameraError(null);
    setDetectedData(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // Check torch capability
      const track = stream.getVideoTracks()[0];
      if (track && typeof (track as any).getCapabilities === 'function') {
        const capabilities = (track as any).getCapabilities();
        if (capabilities && capabilities.torch) {
          setTorchAvailable(true);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
      }

      await checkDevices();
    } catch (err: any) {
      console.error('Camera access error:', err);
      let message = 'Unable to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission was denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No video camera detected on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Camera is already in use by another application.';
      } else if (err.message) {
        message = err.message;
      }
      setCameraError(message);
      setIsScanning(false);
    }
  }, [facingMode, stopStream, checkDevices]);

  // Scan loop
  useEffect(() => {
    if (!isScanning || detectedData) return;

    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);

            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
              const parsed = parseQrData(code.data);
              setDetectedData(parsed);
              playScanChime();

              if (typeof navigator.vibrate === 'function') {
                try {
                  navigator.vibrate([80, 50, 80]);
                } catch {
                  // ignore
                }
              }

              // Hold brief visual confirmation before closing
              setTimeout(() => {
                stopStream();
                onScanSuccess(parsed);
                onOpenChange(false);
              }, 450);
              return;
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [isScanning, detectedData, onScanSuccess, onOpenChange, stopStream]);

  // Manage open/close lifecycle
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [open, startCamera, stopStream]);

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-slate-950 border-slate-800 text-slate-100 shadow-2xl">
        <DialogHeader className="p-4 pb-2 bg-slate-900/80 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">
                Scan Attendance QR Code
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Point your camera at the instructor&apos;s live QR code on screen
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Viewfinder Area */}
        <div className="relative w-full aspect-square sm:aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
          {/* Hidden Canvas for QR processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Video Feed */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isScanning ? 'opacity-100' : 'opacity-0'
            }`}
            autoPlay
            playsInline
            muted
          />

          {/* Camera Error State */}
          {cameraError && (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-950/90 gap-3 z-20">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-rose-300">Camera Unavailable</p>
                <p className="text-xs text-slate-400 max-w-xs">{cameraError}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs border-slate-700 hover:bg-slate-800"
                onClick={startCamera}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Try Again
              </Button>
            </div>
          )}

          {/* Active Viewfinder Overlays */}
          {isScanning && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
              {/* Semi-transparent dark overlay around the scan window */}
              <div className="absolute inset-0 bg-black/40" />

              {/* Scanning Target Box */}
              <div
                className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl transition-all duration-200 ${
                  detectedData
                    ? 'border-2 border-emerald-400 bg-emerald-500/20 scale-105'
                    : 'border border-white/20'
                }`}
              >
                {/* 4 Corner Accents */}
                <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />

                {/* Animated Laser Scanning Line (only when not yet detected) */}
                {!detectedData && (
                  <div className="absolute inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-[bounce_2s_infinite]" />
                )}

                {/* Success Indicator on Target Lock */}
                {detectedData && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-12 h-12 animate-in zoom-in-75 duration-200" />
                    <span className="text-xs font-semibold uppercase tracking-wider bg-black/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                      QR Code Captured!
                    </span>
                  </div>
                )}
              </div>

              {/* Live Guidance Badge */}
              <div className="absolute bottom-4 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-black/75 backdrop-blur-md border-slate-700 text-slate-200 text-[11px] font-mono py-1 px-3 shadow-lg"
                >
                  <ScanLine className="w-3 h-3 mr-1.5 text-emerald-400 animate-pulse" />
                  Align QR code inside the frame
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer Controls */}
        <div className="p-3 bg-slate-900/90 border-t border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasMultipleCameras && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-8 text-slate-300 hover:text-white"
                onClick={handleSwitchCamera}
                disabled={!isScanning}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Switch Camera
              </Button>
            )}

            {torchAvailable && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`text-xs h-8 ${torchOn ? 'text-amber-300 bg-amber-500/10' : 'text-slate-300'}`}
                onClick={toggleTorch}
              >
                {torchOn ? (
                  <>
                    <ZapOff className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    Flash Off
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 mr-1.5" />
                    Flash On
                  </>
                )}
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 ml-auto"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
