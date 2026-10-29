import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  useCourses,
  useCheckAttendanceCode,
  useMarkSelfAttendance,
  useFaceStatus,
} from '@/api/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  calculateAverageEAR,
  BlinkDetector,
} from '@/lib/blink';
import { faceapi, loadFaceApiModels } from '@/lib/faceApi';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  KeyRound,
  RotateCcw,
  Clock,
} from 'lucide-react';

type AttendanceStep = 'ENTER_CODE' | 'CAMERA' | 'RESULT';

interface MarkResultState {
  status: 'PRESENT' | 'FLAGGED';
  integrityScore: number;
  message: string;
}

export const MarkAttendancePage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId: paramSessionId } = useParams<{ sessionId?: string }>();
  const [searchParams] = useSearchParams();
  const querySessionId = searchParams.get('session');

  const { data: courses } = useCourses();
  const { data: faceStatus } = useFaceStatus();
  const checkCodeMutation = useCheckAttendanceCode();
  const markAttendanceMutation = useMarkSelfAttendance();

  // Wizard state machine
  const [step, setStep] = useState<AttendanceStep>('ENTER_CODE');

  // Input states
  const [sessionId, setSessionId] = useState<string>(
    paramSessionId || querySessionId || ''
  );
  const [code, setCode] = useState<string>('');
  const [preCheckError, setPreCheckError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Camera & Detection states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BlinkDetector>(new BlinkDetector({ earThreshold: 0.21, minConsecutiveClosedFrames: 2, timeLimitMs: 8000 }));

  const [modelsReady, setModelsReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceHint, setFaceHint] = useState<string>('Align your face inside the camera frame');
  const [faceCount, setFaceCount] = useState<number>(0);
  const [currentEAR, setCurrentEAR] = useState<number | null>(null);
  const [blinkDetected, setBlinkDetected] = useState<boolean>(false);
  const [blinkCount, setBlinkCount] = useState<number>(0);
  const [livenessTimedOut, setLivenessTimedOut] = useState<boolean>(false);
  const [captureCountdown, setCaptureCountdown] = useState<number>(8);

  // Result state
  const [markResult, setMarkResult] = useState<MarkResultState | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);

  // Helper to safely stop camera streams
  const stopCameraStream = useCallback(() => {
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
    setCameraActive(false);
  }, []);

  // Cleanup on unmount or navigation away
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Load models once
  useEffect(() => {
    let mounted = true;
    async function loadModels() {
      try {
        await loadFaceApiModels('/models');
        if (mounted) {
          setModelsReady(true);
        }
      } catch (err) {
        console.error('Failed to load face-api models', err);
      }
    }
    loadModels();
    return () => {
      mounted = false;
    };
  }, []);

  // Handle Step 1: Pre-check Code (The camera must NOT be opened before this succeeds)
  const handleCheckCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPreCheckError(null);

    const cleanSessionId = sessionId.trim();
    const cleanCode = code.trim();

    if (!cleanSessionId) {
      setPreCheckError('Please provide or select a Session ID');
      return;
    }

    if (!cleanCode || cleanCode.length < 6) {
      setPreCheckError('Please enter the 6-digit attendance code');
      return;
    }

    try {
      const result = await checkCodeMutation.mutateAsync({
        sessionId: cleanSessionId,
        code: cleanCode,
      });

      setSecondsLeft(result.secondsLeft);
      // Only now transition to camera!
      setStep('CAMERA');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Verification failed. Please try again.';
      setPreCheckError(msg);
    }
  };

  // Start Camera ONLY when step transitions to CAMERA
  useEffect(() => {
    if (step !== 'CAMERA') return;

    let isCancelled = false;
    detectorRef.current.reset();
    setBlinkDetected(false);
    setBlinkCount(0);
    setLivenessTimedOut(false);
    setCaptureCountdown(8);
    setCameraError(null);

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } catch (err: any) {
        if (!isCancelled) {
          setCameraError(
            'Unable to access camera. Please allow webcam permissions or use simulation mode below.'
          );
        }
      }
    }

    initCamera();

    return () => {
      isCancelled = true;
      stopCameraStream();
    };
  }, [step, stopCameraStream]);

  // Handle Submission to Server (POST /mark)
  const submitAttendanceMark = useCallback(
    async (descriptor: number[], livenessPassed: boolean) => {
      // Immediately stop all tracks: stream.getTracks().forEach(t => t.stop()) and set video.srcObject = null
      stopCameraStream();
      setStep('RESULT');

      try {
        const result = await markAttendanceMutation.mutateAsync({
          sessionId: sessionId.trim(),
          code: code.trim(),
          descriptor,
          livenessPassed,
        });

        setMarkResult(result);
        setMarkError(null);
      } catch (err: any) {
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          'Failed to mark attendance. Please contact instructor.';
        setMarkError(msg);
      }
    },
    [sessionId, code, markAttendanceMutation, stopCameraStream]
  );

  // Live Detection Loop (~100ms) with EAR and Blink Detection
  useEffect(() => {
    if (step !== 'CAMERA' || !cameraActive || !modelsReady) return;

    let animTimer: number | null = null;
    let isActive = true;
    let hasCaptured = false;

    async function detectFrame() {
      if (!isActive || hasCaptured) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (
        video &&
        canvas &&
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

          // Detect all faces to enforce exactly one face
          const detections = await faceapi
            .detectAllFaces(
              video,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
            )
            .withFaceLandmarks()
            .withFaceDescriptors();

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }

          setFaceCount(detections.length);

          if (detections.length === 0) {
            setFaceHint('No face detected. Please position your face in the camera frame.');
            setCurrentEAR(null);
          } else if (detections.length > 1) {
            setFaceHint('Multiple faces detected. Please ensure only you are in frame.');
            setCurrentEAR(null);
          } else {
            // Exactly one face in frame!
            const detection = detections[0];
            const landmarks = detection.landmarks.positions;

            // Draw HUD
            if (ctx) {
              const resized = faceapi.resizeResults(detection, displaySize);
              const box = resized.detection.box;

              ctx.save();
              ctx.strokeStyle = '#38bdf8'; // Sky 400
              ctx.lineWidth = 2;
              ctx.strokeRect(box.x, box.y, box.width, box.height);

              // Draw subtle eye landmark points
              ctx.fillStyle = '#34d399';
              for (let i = 36; i < 48; i++) {
                const pt = resized.landmarks.positions[i];
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
                ctx.fill();
              }
              ctx.restore();
            }

            // Compute Eye Aspect Ratio from 68 landmarks
            const ear = calculateAverageEAR(landmarks);
            setCurrentEAR(Math.round(ear * 1000) / 1000);

            // Update BlinkDetector
            const updateRes = detectorRef.current.update(ear, Date.now());
            setBlinkCount(updateRes.blinkCount);
            setBlinkDetected(detectorRef.current.passed);
            setLivenessTimedOut(detectorRef.current.timedOut);

            const remainingSec = Math.max(0, Math.ceil((8000 - updateRes.elapsedMs) / 1000));
            setCaptureCountdown(remainingSec);

            if (detectorRef.current.passed) {
              setFaceHint('Blink verified! Capturing face descriptor...');
            } else if (detectorRef.current.timedOut) {
              setFaceHint('Liveness timeout reached. Proceeding to capture...');
            } else {
              setFaceHint('Blink once or twice naturally');
            }

            // After blink (or timeout), capture ONE descriptor from a frame with eyes open (EAR >= 0.21)
            const isReadyToCapture =
              (detectorRef.current.passed || detectorRef.current.timedOut) &&
              ear >= 0.21 &&
              detection.descriptor &&
              detection.descriptor.length === 128;

            if (isReadyToCapture && !hasCaptured) {
              hasCaptured = true;
              const descriptorArray = Array.from(detection.descriptor);
              const livenessPassed = detectorRef.current.passed;
              submitAttendanceMark(descriptorArray, livenessPassed);
              return;
            }
          }
        } catch {
          // ignore frame skip
        }
      }

      if (isActive && !hasCaptured) {
        animTimer = window.setTimeout(detectFrame, 100);
      }
    }

    detectFrame();

    return () => {
      isActive = false;
      if (animTimer) clearTimeout(animTimer);
    };
  }, [step, cameraActive, modelsReady, submitAttendanceMark]);

  // Simulation mode for headless or camera-less testing
  const handleSimulateBlinkCapture = () => {
    // Generate a synthetic 128-dimensional vector
    const syntheticDescriptor = Array.from({ length: 128 }, () => Math.random() * 0.2 - 0.1);
    submitAttendanceMark(syntheticDescriptor, true);
  };

  const handleReset = () => {
    stopCameraStream();
    setCode('');
    setPreCheckError(null);
    setMarkResult(null);
    setMarkError(null);
    setStep('ENTER_CODE');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/student')}
          className="text-xs text-slate-400 hover:text-slate-200 gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <div className="flex items-center gap-2">
          {faceStatus?.enrolled ? (
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Face Biometrics Enrolled
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Face Enrollment Recommended
            </Badge>
          )}
        </div>
      </div>

      {/* Main Title Card */}
      <div className="rounded-xl bg-gradient-to-r from-blue-950/40 via-card to-card border border-border p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight">
              Mark Attendance (Self-Verification)
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Mode B: Short-window passcode check followed by blink liveness & face descriptor
            </p>
          </div>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <div
            className={`p-2 rounded-lg border text-center text-xs font-mono transition-all ${
              step === 'ENTER_CODE'
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-semibold'
                : 'bg-slate-900/40 border-slate-800 text-slate-400'
            }`}
          >
            1. Enter Code
          </div>
          <div
            className={`p-2 rounded-lg border text-center text-xs font-mono transition-all ${
              step === 'CAMERA'
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-semibold'
                : 'bg-slate-900/40 border-slate-800 text-slate-400'
            }`}
          >
            2. Blink & Scan
          </div>
          <div
            className={`p-2 rounded-lg border text-center text-xs font-mono transition-all ${
              step === 'RESULT'
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-semibold'
                : 'bg-slate-900/40 border-slate-800 text-slate-400'
            }`}
          >
            3. Result
          </div>
        </div>
      </div>

      {/* STEP 1: ENTER_CODE */}
      {step === 'ENTER_CODE' && (
        <Card className="border-border bg-card shadow-xl">
          <CardHeader>
            <CardTitle className="text-base">Step 1: Enter Attendance Code</CardTitle>
            <CardDescription className="text-xs">
              Input the 6-digit passcode displayed by your instructor. The camera will only activate
              after the code and window are confirmed valid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCheckCode} className="space-y-4">
              {preCheckError && (
                <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Code Verification Failed</p>
                    <p className="mt-0.5 text-[11px] opacity-90">{preCheckError}</p>
                  </div>
                </div>
              )}

              {/* Session Selector or Manual Input */}
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                  Select Lecture Session or Enter Session UUID
                </label>
                <div className="space-y-2">
                  {courses && courses.length > 0 && (
                    <select
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                      className="w-full h-10 rounded-md border border-border bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Or choose from enrolled course sessions --</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.title}
                        </option>
                      ))}
                    </select>
                  )}
                  <Input
                    placeholder="Session ID (UUID)"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="font-mono text-xs bg-slate-900"
                    required
                  />
                </div>
              </div>

              {/* 6-Digit Code Input */}
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                  6-Digit Rotating Attendance Code
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 582914"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="h-12 text-center font-mono text-2xl tracking-widest bg-slate-950 font-bold border-blue-500/40 text-slate-100"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter the numeric passcode currently displayed on the classroom screen.
                </p>
              </div>

              <Button
                type="submit"
                disabled={checkCodeMutation.isPending || code.length < 6 || !sessionId}
                className="w-full bg-blue-600 hover:bg-blue-500 font-semibold gap-2 mt-2 h-10"
              >
                {checkCodeMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Validating Code & Window...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Validate Code & Open Camera →
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: CAMERA (ONLY AFTER PRE-CHECK SUCCEEDS) */}
      {step === 'CAMERA' && (
        <Card className="border-border bg-card shadow-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/80 text-center">
            <div className="inline-flex items-center justify-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mx-auto mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Passcode Accepted ({secondsLeft ? `${secondsLeft}s window` : 'Window Active'})</span>
            </div>
            <CardTitle className="text-lg">Blink Once or Twice</CardTitle>
            <CardDescription className="text-xs">{faceHint}</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center pt-4 space-y-4">
            {/* Viewport */}
            <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-border flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 ${
                  cameraActive ? 'block' : 'hidden'
                }`}
              />

              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 ${
                  cameraActive ? 'block' : 'hidden'
                }`}
              />

              {!cameraActive && (
                <div className="text-center p-6 text-slate-500 text-sm space-y-3">
                  <Camera className="w-10 h-10 mx-auto opacity-40 text-slate-400 animate-pulse" />
                  <p className="text-xs text-slate-400">
                    {cameraError || 'Initializing biometric camera...'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSimulateBlinkCapture}
                    className="text-xs font-mono border-slate-700 bg-slate-900/80 hover:bg-slate-800 gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Simulate Blink & Capture (Test Fallback)
                  </Button>
                </div>
              )}

              {/* Overlay HUD indicators */}
              {cameraActive && (
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none z-10">
                  {blinkDetected ? (
                    <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono px-2.5 py-0.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Blink Verified ({blinkCount}) ✓
                    </div>
                  ) : (
                    <div className="bg-blue-950/80 border border-blue-500/40 text-blue-300 text-[11px] font-mono px-2.5 py-0.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1.5">
                      <Eye className="w-3 h-3 text-blue-400 animate-pulse" />
                      Awaiting Blink ({captureCountdown}s)
                    </div>
                  )}

                  {currentEAR !== null && (
                    <div className="bg-slate-950/80 border border-slate-800 text-slate-400 text-[10px] font-mono px-2 py-0.5 rounded-full w-fit">
                      EAR: {currentEAR.toFixed(3)} {currentEAR < 0.21 ? '(Closed)' : '(Open)'}
                    </div>
                  )}
                </div>
              )}

              {/* Status pill in bottom corner */}
              {cameraActive && (
                <div className="absolute bottom-3 right-3 pointer-events-none z-10">
                  <div className="bg-slate-950/80 border border-slate-800 text-[10px] font-mono px-2 py-0.5 rounded-md text-slate-400">
                    Faces: {faceCount === 1 ? '1 Face (Locked)' : faceCount}
                  </div>
                </div>
              )}
            </div>

            {/* Instruction Banner */}
            <div className="w-full p-3 rounded-lg bg-slate-900/60 border border-border text-xs text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  {blinkDetected
                    ? 'Blink verified! Saving facial descriptor vector...'
                    : livenessTimedOut
                    ? '8-second limit reached. Continuing for review...'
                    : `Please blink naturally. Auto-capturing (${captureCountdown}s left)`}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSimulateBlinkCapture}
                className="text-[11px] font-mono text-slate-400 hover:text-white h-7 px-2"
              >
                Skip to test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: RESULT */}
      {step === 'RESULT' && (
        <Card className="border-border bg-card shadow-2xl overflow-hidden">
          <CardHeader className="text-center pb-4 border-b border-border/80">
            {markAttendanceMutation.isPending ? (
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : markResult?.status === 'PRESENT' ? (
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            ) : markResult?.status === 'FLAGGED' ? (
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2">
                <AlertTriangle className="w-7 h-7" />
              </div>
            ) : (
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-2">
                <XCircle className="w-7 h-7" />
              </div>
            )}

            <CardTitle className="text-xl">
              {markAttendanceMutation.isPending
                ? 'Processing Attendance Verification...'
                : markResult?.status === 'PRESENT'
                ? 'Attendance Verified: PRESENT'
                : markResult?.status === 'FLAGGED'
                ? 'Attendance Status: FLAGGED'
                : 'Verification Rejected'}
            </CardTitle>
            <CardDescription className="text-xs">
              Biometric Euclidean distance & campus network integrity evaluation
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-5">
            {markAttendanceMutation.isPending ? (
              <div className="text-center py-6 text-xs text-slate-400 font-mono space-y-2">
                <p>Verifying 128-dimensional embedding against registered profile...</p>
                <p className="text-[11px] text-slate-500">Camera hardware has been fully shut down.</p>
              </div>
            ) : markResult ? (
              <div className="space-y-4">
                {/* Status Box */}
                <div
                  className={`p-4 rounded-xl border ${
                    markResult.status === 'PRESENT'
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge
                        className={
                          markResult.status === 'PRESENT'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs font-mono mb-2'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/40 text-xs font-mono mb-2'
                        }
                      >
                        {markResult.status}
                      </Badge>
                      <p className="text-sm font-semibold">{markResult.message}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] uppercase font-mono text-slate-400">Integrity Score</p>
                      <p className="text-2xl font-black font-mono mt-0.5">
                        {Math.round(markResult.integrityScore * 100)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-2 font-mono">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Attendance Method:</span>
                    <span className="text-slate-200">SELF (Short-Window Mode B)</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Camera Status:</span>
                    <span className="text-emerald-400">Off (Hardware indicator light off)</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Privacy Policy:</span>
                    <span className="text-slate-200">Zero Image Storage (Vectors Only)</span>
                  </div>
                </div>
              </div>
            ) : markError ? (
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 space-y-2">
                <p className="text-sm font-semibold">Attendance Rejected by Server</p>
                <p className="text-xs opacity-90">{markError}</p>
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="default"
                onClick={() => navigate('/student')}
                className="flex-1 bg-blue-600 hover:bg-blue-500"
              >
                Return to Dashboard
              </Button>

              <Button
                variant="outline"
                onClick={handleReset}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Mark Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
