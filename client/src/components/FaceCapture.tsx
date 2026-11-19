import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, ScanFace, RotateCcw, Sparkles } from 'lucide-react';
import { faceapi, loadFaceApiModels } from '@/lib/faceApi';

interface FaceCaptureProps {
  onCapture: (descriptor: number[]) => void;
  title?: string;
  description?: string;
  buttonLabel?: string;
  disabled?: boolean;
}

export const FaceCapture: React.FC<FaceCaptureProps> = ({
  onCapture,
  title = 'Facial Biometric Capture',
  description = 'Position your face clearly within the camera frame for 3-frame multi-angle sampling',
  buttonLabel = 'Capture 3 Frames & Compute Embedding',
  disabled = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [modelLoadingError, setModelLoadingError] = useState<string | null>(null);

  const [capturing, setCapturing] = useState(false);
  const [captureStep, setCaptureStep] = useState<number>(0); // 0 = idle, 1 = frame 1, 2 = frame 2, 3 = frame 3, 4 = done
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionConfidence, setDetectionConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedSuccess, setCapturedSuccess] = useState(false);
  const [capturedFramesCount, setCapturedFramesCount] = useState<number>(0);

  // Load models on component mount
  useEffect(() => {
    let isMounted = true;
    async function initModels() {
      try {
        await loadFaceApiModels('/models');
        if (isMounted) {
          setModelsReady(true);
        }
      } catch (err) {
        console.error('Failed to initialize face-api models:', err);
        if (isMounted) {
          setModelLoadingError('Could not load biometric neural network models from /models.');
        }
      }
    }

    initModels();
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize camera stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isMounted = true;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });
        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamActive(true);
          setError(null);
        }
      } catch (err) {
        console.warn('Camera access denied or unavailable:', err);
        if (isMounted) {
          setStreamActive(false);
          setError('Webcam unavailable or permission was not granted. You can use the Demo Simulation mode below.');
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Continuous live detection & overlay rendering
  useEffect(() => {
    let animId: number;
    let isRunning = true;

    async function detectLoop() {
      if (!isRunning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (
        video &&
        canvas &&
        streamActive &&
        modelsReady &&
        video.readyState >= 2 &&
        !video.paused &&
        !video.ended
      ) {
        try {
          const displaySize = {
            width: video.videoWidth || 640,
            height: video.videoHeight || 480,
          };

          if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
            faceapi.matchDimensions(canvas, displaySize);
          }

          const detection = await faceapi
            .detectSingleFace(
              video,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
            )
            .withFaceLandmarks();

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (detection) {
              setFaceDetected(true);
              const score = detection.detection.score;
              setDetectionConfidence(Math.round(score * 100));

              const resized = faceapi.resizeResults(detection, displaySize);
              const box = resized.detection.box;

              // Draw stylized HUD frame around face
              ctx.save();
              ctx.strokeStyle = '#10b981'; // Emerald 500
              ctx.lineWidth = 2;
              ctx.shadowColor = '#10b981';
              ctx.shadowBlur = 8;

              // Corner brackets
              const cornerLen = Math.min(24, box.width * 0.2);
              // Top-left
              ctx.beginPath();
              ctx.moveTo(box.x, box.y + cornerLen);
              ctx.lineTo(box.x, box.y);
              ctx.lineTo(box.x + cornerLen, box.y);
              ctx.stroke();

              // Top-right
              ctx.beginPath();
              ctx.moveTo(box.x + box.width - cornerLen, box.y);
              ctx.lineTo(box.x + box.width, box.y);
              ctx.lineTo(box.x + box.width, box.y + cornerLen);
              ctx.stroke();

              // Bottom-left
              ctx.beginPath();
              ctx.moveTo(box.x, box.y + box.height - cornerLen);
              ctx.lineTo(box.x, box.y + box.height);
              ctx.lineTo(box.x + cornerLen, box.y + box.height);
              ctx.stroke();

              // Bottom-right
              ctx.beginPath();
              ctx.moveTo(box.x + box.width - cornerLen, box.y + box.height);
              ctx.lineTo(box.x + box.width, box.y + box.height);
              ctx.lineTo(box.x + box.width, box.y + box.height - cornerLen);
              ctx.stroke();

              // Draw subtle landmarks
              const landmarks = resized.landmarks.positions;
              ctx.fillStyle = 'rgba(56, 189, 248, 0.7)'; // Sky 400
              for (const pt of landmarks) {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 1.5, 0, 2 * Math.PI);
                ctx.fill();
              }

              // Text label
              ctx.font = '11px monospace';
              ctx.fillStyle = '#10b981';
              ctx.fillText(`LOCKED (${Math.round(score * 100)}%)`, box.x, Math.max(16, box.y - 8));

              ctx.restore();
            } else {
              setFaceDetected(false);
              setDetectionConfidence(null);
            }
          }
        } catch {
          // Ignore sporadic detection loop frame skips
        }
      }

      // Run ~12 fps detection to keep browser UI performant
      animId = window.setTimeout(detectLoop, 80);
    }

    if (streamActive && modelsReady) {
      detectLoop();
    }

    return () => {
      isRunning = false;
      if (animId) clearTimeout(animId);
    };
  }, [streamActive, modelsReady]);

  // Capture 3 frames and average descriptors
  const handleCapture3Frames = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !streamActive) {
      setError('Camera video feed is not active. Please start camera.');
      return;
    }

    if (!modelsReady) {
      setError('Neural network models are still loading. Please wait a moment.');
      return;
    }

    setCapturing(true);
    setError(null);
    setCapturedSuccess(false);
    setCapturedFramesCount(0);

    const collectedDescriptors: number[][] = [];
    const MAX_FRAMES = 3;

    try {
      for (let frameIndex = 1; frameIndex <= MAX_FRAMES; frameIndex++) {
        setCaptureStep(frameIndex);

        // Wait a short moment between frames to allow slight natural facial micro-movements
        await new Promise((resolve) => setTimeout(resolve, 450));

        let frameSuccess = false;
        let retries = 0;

        while (!frameSuccess && retries < 8) {
          const result = await faceapi
            .detectSingleFace(
              video,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
            )
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (result && result.descriptor && result.descriptor.length > 0) {
            collectedDescriptors.push(Array.from(result.descriptor));
            setCapturedFramesCount(frameIndex);
            frameSuccess = true;
          } else {
            retries++;
            // Small pause before retry if face temporarily moved or blinked
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }

        if (!frameSuccess) {
          throw new Error(
            `Face lost during sample ${frameIndex} of ${MAX_FRAMES}. Please keep your face steady inside the camera frame.`
          );
        }
      }

      // Average the 3 descriptors across all 128 embedding dimensions
      const descriptorLength = collectedDescriptors[0].length;
      const averaged = new Array(descriptorLength).fill(0);

      for (let d = 0; d < descriptorLength; d++) {
        let sum = 0;
        for (let f = 0; f < collectedDescriptors.length; f++) {
          sum += collectedDescriptors[f][d];
        }
        averaged[d] = sum / collectedDescriptors.length;
      }

      setCaptureStep(4);
      setCapturedSuccess(true);
      onCapture(averaged);
    } catch (err: any) {
      setError(err?.message || 'Failed to capture 3 facial frames. Ensure adequate lighting and face centering.');
      setCaptureStep(0);
    } finally {
      setCapturing(false);
    }
  }, [streamActive, modelsReady, onCapture]);

  // Fallback simulation for headless environments or users without camera
  const handleSimulateCapture = async () => {
    setCapturing(true);
    setError(null);
    setCapturedSuccess(false);
    setCapturedFramesCount(0);

    try {
      const mockFrames: number[][] = [];
      const baseSeed = Array.from({ length: 128 }, () => Math.random() * 0.2 - 0.1);

      for (let i = 1; i <= 3; i++) {
        setCaptureStep(i);
        await new Promise((resolve) => setTimeout(resolve, 400));
        // Add tiny variation to simulate realistic frame variance
        const frameVector = baseSeed.map((v) => v + (Math.random() * 0.02 - 0.01));
        mockFrames.push(frameVector);
        setCapturedFramesCount(i);
      }

      const averaged = new Array(128).fill(0);
      for (let d = 0; d < 128; d++) {
        averaged[d] = (mockFrames[0][d] + mockFrames[1][d] + mockFrames[2][d]) / 3;
      }

      setCaptureStep(4);
      setCapturedSuccess(true);
      onCapture(averaged);
    } catch {
      setError('Simulation failed.');
    } finally {
      setCapturing(false);
    }
  };

  const handleReset = () => {
    setCapturedSuccess(false);
    setCaptureStep(0);
    setCapturedFramesCount(0);
    setError(null);
  };

  return (
    <Card className="max-w-lg mx-auto border-slate-200 bg-white shadow-xs overflow-hidden">
      <CardHeader className="text-center pb-3 border-b border-slate-100">
        <div className="mx-auto w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-2">
          <ScanFace className="w-5 h-5" />
        </div>
        <CardTitle className="text-lg font-bold text-slate-900 flex items-center justify-center gap-2">
          {title}
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 font-medium max-w-sm mx-auto">{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4 pt-4">
        {/* Video / Canvas Viewport */}
        <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform -scale-x-100 ${streamActive ? 'block' : 'hidden'}`}
          />

          {/* Real-time Detection Canvas Overlay */}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 ${
              streamActive ? 'block' : 'hidden'
            }`}
          />

          {!streamActive && (
            <div className="text-center p-6 text-slate-500 text-sm space-y-2">
              <Camera className="w-10 h-10 mx-auto opacity-30 text-slate-400 animate-pulse" />
              <p className="text-xs text-slate-400 font-medium">Camera preview inactive or blocked</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulateCapture}
                disabled={capturing || disabled}
                className="text-xs font-mono mt-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                Run 3-Frame Simulation (Demo)
              </Button>
            </div>
          )}

          {/* Biometric Status Indicator Pill */}
          {streamActive && (
            <div className="absolute top-3 left-3 pointer-events-none z-10">
              {faceDetected ? (
                <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Face Aligned {detectionConfidence ? `(${detectionConfidence}%)` : ''}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[11px] font-mono px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Align face in center
                </div>
              )}
            </div>
          )}

          {/* Model Loading State Overlay */}
          {!modelsReady && !modelLoadingError && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-20">
              <div className="flex items-center gap-2 text-xs font-mono text-blue-400 bg-slate-900 border border-blue-500/30 px-3 py-2 rounded-lg">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Loading biometric models from /models...
              </div>
            </div>
          )}

          {/* Visual Target Reticle */}
          {streamActive && !faceDetected && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-44 h-56 border-2 border-dashed border-blue-500/40 rounded-2xl flex items-center justify-center">
                <span className="text-[10px] uppercase font-mono tracking-wider text-blue-400/80 font-bold">
                  Target Zone
                </span>
              </div>
            </div>
          )}

          {/* Flash animation during capture */}
          {capturing && (
            <div className="absolute inset-0 border-4 border-blue-500/70 pointer-events-none animate-pulse rounded-xl" />
          )}
        </div>

        {/* 3-Frame Capture Stepper */}
        <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-slate-800">Biometric Sampling Progress</span>
            <span className="font-mono text-slate-500 font-semibold">{capturedFramesCount} / 3 Frames</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((frameNum) => {
              const isDone = capturedFramesCount >= frameNum || capturedSuccess;
              const isCurrent = capturing && captureStep === frameNum;

              return (
                <div
                  key={frameNum}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md border text-xs font-mono transition-all ${
                    isDone
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold shadow-2xs'
                      : isCurrent
                      ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold animate-pulse'
                      : 'bg-white border-slate-200 text-slate-400 font-medium'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : isCurrent ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  ) : (
                    <span className="w-3.5 h-3.5 text-center text-[10px] leading-none text-slate-400">○</span>
                  )}
                  <span>Frame {frameNum}</span>
                </div>
              );
            })}
          </div>

          {capturing && (
            <p className="text-[11px] text-center text-blue-700 font-mono mt-2 animate-pulse font-semibold">
              Extracting frame {captureStep} of 3... Hold steady
            </p>
          )}

          {capturedSuccess && (
            <p className="text-[11px] text-center text-emerald-700 font-mono mt-2 flex items-center justify-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              3 frames captured & descriptors averaged (128-dim vector)
            </p>
          )}
        </div>

        {/* Error message */}
        {(error || modelLoadingError) && (
          <div className="w-full flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-300 p-2.5 rounded-md font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{error || modelLoadingError}</p>
              {!streamActive && (
                <button
                  type="button"
                  onClick={handleSimulateCapture}
                  className="mt-1 text-blue-700 font-semibold hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Click here to run demo simulation without webcam
                </button>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="w-full flex gap-2">
          {capturedSuccess ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="w-full text-xs border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-2" />
              Retake Biometric Frames
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleCapture3Frames}
              disabled={capturing || disabled || !modelsReady || !streamActive}
              variant="default"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
            >
              {capturing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Capturing 3 Frames...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  {buttonLabel}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
