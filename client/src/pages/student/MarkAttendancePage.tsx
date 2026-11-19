import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  useActiveAttendanceSessions,
  useCheckAttendanceCode,
  useMarkSelfAttendance,
  useScanQRAttendance,
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
  QrCode,
  ScanLine,
  ScanFace,
  Loader2,
} from 'lucide-react';
import {
  QrScannerDialog,
  ParsedQrData,
} from '@/components/attendance/QrScannerDialog';

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

  const { data: activeSessions } = useActiveAttendanceSessions();
  const { data: faceStatus } = useFaceStatus();
  const checkCodeMutation = useCheckAttendanceCode();
  const markAttendanceMutation = useMarkSelfAttendance();
  const scanQRMutation = useScanQRAttendance();

  const queryToken = searchParams.get('qrCodeToken') || searchParams.get('token');
  const queryMode = searchParams.get('mode');
  const queryScan = searchParams.get('scan') === 'true';

  // Mode switcher: MODE_B vs QR
  const [checkInMode, setCheckInMode] = useState<'MODE_B' | 'QR'>(
    queryToken || queryMode === 'qr' || queryScan ? 'QR' : 'MODE_B'
  );
  const [qrToken, setQrToken] = useState<string>(queryToken || '');
  const [qrSuccessRecord, setQrSuccessRecord] = useState<any | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState<boolean>(queryScan);

  const handleQRCheckIn = async (
    e?: React.FormEvent,
    overrideSessionId?: string,
    overrideToken?: string
  ) => {
    if (e) e.preventDefault();
    setQrError(null);
    setQrSuccessRecord(null);

    const targetSessionId = (overrideSessionId || sessionId).trim();
    const targetToken = (overrideToken || qrToken).trim();

    if (!targetSessionId) {
      setQrError('Session ID is required.');
      return;
    }
    if (!targetToken) {
      setQrError('QR code token is required.');
      return;
    }

    try {
      const res = await scanQRMutation.mutateAsync({
        sessionId: targetSessionId,
        qrCodeToken: targetToken,
      });
      setQrSuccessRecord(res.record || res);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Attendance check-in failed';
      setQrError(msg);
    }
  };

  const handleQrScanSuccess = (data: ParsedQrData) => {
    const nextSessionId = (data.sessionId || sessionId).trim();
    const nextToken = (data.qrCodeToken || qrToken).trim();

    if (data.sessionId) {
      setSessionId(data.sessionId);
    }
    if (data.qrCodeToken) {
      setQrToken(data.qrCodeToken);
    }

    // If both session and token are identified, auto-submit check-in
    if (nextSessionId && nextToken) {
      handleQRCheckIn(undefined, nextSessionId, nextToken);
    }
  };

  // Wizard state machine
  const [step, setStep] = useState<AttendanceStep>('ENTER_CODE');

  // Input states
  const [sessionId, setSessionId] = useState<string>(
    paramSessionId || querySessionId || ''
  );

  // Auto-select active session if student has exactly one active session and none selected yet
  useEffect(() => {
    if (!sessionId && activeSessions && activeSessions.length === 1) {
      setSessionId(activeSessions[0].id);
    }
  }, [activeSessions, sessionId]);

  const [code, setCode] = useState<string>('');
  const [preCheckError, setPreCheckError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Camera & Detection states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isCapturingRef = useRef<boolean>(false);
  const detectorRef = useRef<BlinkDetector>(
    new BlinkDetector({ earThreshold: 0.22, minConsecutiveClosedFrames: 1, timeLimitMs: 8000 })
  );

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
    isCapturingRef.current = false;
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
          try {
            await videoRef.current.play();
          } catch {
            // ignore play interruption
          }
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
        console.error('Attendance marking submission error:', err);
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
      if (!isActive || hasCaptured || isCapturingRef.current) {
        if (isActive && !hasCaptured) {
          animTimer = window.setTimeout(detectFrame, 80);
        }
        return;
      }

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

          // Detect all faces to enforce exactly one face (landmarks only, fast ~30 FPS)
          const detections = await faceapi
            .detectAllFaces(
              video,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
            )
            .withFaceLandmarks();

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
              setFaceHint('Liveness timeout reached. Capturing face descriptor...');
            } else {
              setFaceHint('Blink once or twice naturally');
            }

            // After blink (or timeout), capture ONE descriptor from a frame with eyes open
            if (
              (detectorRef.current.passed || detectorRef.current.timedOut) &&
              !hasCaptured &&
              !isCapturingRef.current
            ) {
              isCapturingRef.current = true;
              try {
                let descriptorArray: number[] | null = null;
                const singleDetection = await faceapi
                  .detectSingleFace(
                    video,
                    new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 })
                  )
                  .withFaceLandmarks()
                  .withFaceDescriptor();

                if (singleDetection?.descriptor && singleDetection.descriptor.length === 128) {
                  descriptorArray = Array.from(singleDetection.descriptor);
                } else {
                  // Fallback: extract using detectAllFaces if detectSingleFace missed
                  const allDetections = await faceapi
                    .detectAllFaces(
                      video,
                      new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 })
                    )
                    .withFaceLandmarks()
                    .withFaceDescriptors();
                  if (allDetections.length > 0 && allDetections[0].descriptor?.length === 128) {
                    descriptorArray = Array.from(allDetections[0].descriptor);
                  }
                }

                if (descriptorArray) {
                  hasCaptured = true;
                  const livenessPassed = detectorRef.current.passed;
                  submitAttendanceMark(descriptorArray, livenessPassed);
                  return;
                } else {
                  isCapturingRef.current = false;
                  setFaceHint('Blink verified! Hold steady facing the camera...');
                }
              } catch (captureErr) {
                console.error('Error during automatic face capture:', captureErr);
                isCapturingRef.current = false;
              }
            }
          }
        } catch {
          // ignore frame skip
        }
      }

      if (isActive && !hasCaptured) {
        animTimer = window.setTimeout(detectFrame, 80);
      }
    }

    detectFrame();

    return () => {
      isActive = false;
      if (animTimer) clearTimeout(animTimer);
    };
  }, [step, cameraActive, modelsReady, submitAttendanceMark]);

  // Manual capture fallback: extract actual webcam facial descriptor directly
  const handleManualCapture = useCallback(async () => {
    if (!videoRef.current || !modelsReady || isCapturingRef.current) return;
    isCapturingRef.current = true;
    setFaceHint('Capturing facial biometric...');

    try {
      let descriptorArray: number[] | null = null;
      const singleDetection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (singleDetection?.descriptor && singleDetection.descriptor.length === 128) {
        descriptorArray = Array.from(singleDetection.descriptor);
      } else {
        const allDetections = await faceapi
          .detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 })
          )
          .withFaceLandmarks()
          .withFaceDescriptors();
        if (allDetections.length > 0 && allDetections[0].descriptor?.length === 128) {
          descriptorArray = Array.from(allDetections[0].descriptor);
        }
      }

      if (descriptorArray) {
        submitAttendanceMark(descriptorArray, detectorRef.current.passed);
      } else {
        isCapturingRef.current = false;
        setFaceHint('Face not clearly detected. Please look directly into the camera.');
      }
    } catch (err) {
      isCapturingRef.current = false;
      setFaceHint('Capture error. Please try again.');
    }
  }, [modelsReady, submitAttendanceMark]);

  // Simulation mode for headless or camera-less testing
  const handleSimulateBlinkCapture = () => {
    // Generate a synthetic 128-dimensional vector
    const syntheticDescriptor = Array.from({ length: 128 }, () => Math.random() * 0.2 - 0.1);
    submitAttendanceMark(syntheticDescriptor, true);
  };

  const handleReset = () => {
    stopCameraStream();
    isCapturingRef.current = false;
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
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <div className="flex items-center gap-2">
          {faceStatus?.enrolled ? (
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-mono font-semibold flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Face Biometrics Enrolled
            </Badge>
          ) : (
            <Badge className="bg-amber-50 text-amber-800 border border-amber-300 text-xs font-mono font-semibold flex items-center gap-1.5 shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Face Enrollment Recommended
            </Badge>
          )}
        </div>
      </div>

      {/* Main Title Card */}
      <div className="rounded-xl bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/50 border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center shadow-2xs">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
              Mark Attendance (Self-Verification)
            </h1>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Mode B: Short-window passcode check followed by blink liveness & face descriptor
            </p>
          </div>
        </div>

        {/* Method Switcher */}
        <div className="flex items-center gap-1.5 mt-4 p-1 rounded-lg bg-slate-100 border border-slate-200 self-start inline-flex">
          <Button
            type="button"
            variant={checkInMode === 'MODE_B' ? 'default' : 'ghost'}
            size="sm"
            className={`text-xs h-7 gap-1.5 font-semibold ${checkInMode === 'MODE_B'
                ? 'bg-white text-slate-900 shadow-xs hover:bg-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            onClick={() => setCheckInMode('MODE_B')}
          >
            <KeyRound className="w-3 h-3 text-blue-600" />
            <span>Mode B (Passcode + Liveness)</span>
          </Button>

          <Button
            type="button"
            variant={checkInMode === 'QR' ? 'default' : 'ghost'}
            size="sm"
            className={`text-xs h-7 gap-1.5 font-semibold ${checkInMode === 'QR'
                ? 'bg-white text-slate-900 shadow-xs hover:bg-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            onClick={() => setCheckInMode('QR')}
          >
            <QrCode className="w-3 h-3 text-indigo-600" />
            <span>Direct QR / Token Check-In</span>
          </Button>
        </div>

        {/* Stepper Progress Indicator (only shown for Mode B) */}
        {checkInMode === 'MODE_B' && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div
              className={`p-2 rounded-lg border text-center text-xs font-mono transition-all ${step === 'ENTER_CODE'
                  ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-500 font-medium'
                }`}
            >
              1. Enter Code
            </div>
            <div
              className={`p-2 rounded-lg border text-center text-xs font-mono transition-all ${step === 'CAMERA'
                  ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-500 font-medium'
                }`}
            >
              2. Blink & Scan
            </div>
            <div
              className={`p-2 rounded-lg border text-center text-xs font-mono transition-all ${step === 'RESULT'
                  ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-500 font-medium'
                }`}
            >
              3. Result
            </div>
          </div>
        )}
      </div>

      {/* QR Check-In View */}
      {checkInMode === 'QR' && (
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-base font-bold text-slate-900">Direct QR & Token Check-In</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 font-medium">
              Check in using the rotating cryptographic token embedded in the instructor&apos;s QR code.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {qrSuccessRecord ? (
              <div className="space-y-5 text-center p-6 border rounded-xl bg-emerald-50/70 border-emerald-200 shadow-2xs">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-emerald-950">Attendance Recorded Successfully!</h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Your attendance has been verified via the QR security token.
                  </p>
                </div>

                <div className="max-w-xs mx-auto p-3.5 rounded-lg bg-white border border-slate-200 text-xs space-y-2 text-left shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Status</span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold">
                      PRESENT
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Method</span>
                    <Badge variant="outline" className="font-mono text-[10px] bg-slate-100 text-slate-700 border-slate-200 font-semibold">
                      QR TOKEN
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Recorded At</span>
                    <span className="font-mono text-[11px] font-bold text-slate-900">
                      {new Date(qrSuccessRecord.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                    onClick={() => navigate('/student?tab=attendance')}
                  >
                    View Check-In History
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                    onClick={() => {
                      setQrSuccessRecord(null);
                      setQrToken('');
                    }}
                  >
                    Check In Another
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleQRCheckIn} className="space-y-4">
                {/* In-App Camera QR Scanner Quick Action */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                      <Camera className="w-4 h-4 text-blue-600" />
                      <span>Scan with Application Camera</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Open your webcam or mobile camera to automatically scan the QR code and check in.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setQrScannerOpen(true)}
                    className="h-9 px-4 text-xs font-semibold gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs flex-shrink-0"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan QR Code</span>
                  </Button>
                </div>

                {qrError && (
                  <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Verification Failed</p>
                      <p className="mt-0.5 text-[11px] font-medium">{qrError}</p>
                    </div>
                  </div>
                )}

                {/* Session Selector or Manual Input */}
                <div>
                  <label className="text-xs font-bold text-slate-800 mb-1.5 block">
                    Select Live Session or Enter Session UUID
                  </label>
                  <div className="space-y-2">
                    {activeSessions && activeSessions.length > 0 ? (
                      <select
                        value={sessionId}
                        onChange={(e) => setSessionId(e.target.value)}
                        className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer shadow-2xs"
                      >
                        <option value="">-- Choose active lecture session --</option>
                        {activeSessions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.course.code} — {s.title} (Active Now)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium flex items-center justify-between">
                        <span>No live attendance sessions active right now for your courses.</span>
                        <span className="font-mono text-[10px] text-slate-500">Manual entry below</span>
                      </div>
                    )}

                    <Input
                      placeholder="Or enter Session UUID (e.g., 550e8400-e29b-41d4-a716-446655440000)"
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                      className="text-xs font-mono h-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                {/* QR Code Token Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      QR Code Token / Passcode
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setQrScannerOpen(true)}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold p-0 h-auto gap-1"
                    >
                      <Camera className="w-3 h-3" />
                      Open Camera Scanner
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter or paste token from QR code..."
                      value={qrToken}
                      onChange={(e) => setQrToken(e.target.value)}
                      className="text-sm font-mono tracking-widest h-11 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 flex-1"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setQrScannerOpen(true)}
                      className="h-11 px-3.5 border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold gap-1.5 flex-shrink-0 text-xs shadow-2xs"
                      title="Scan with Camera"
                    >
                      <ScanLine className="w-4 h-4 text-blue-600" />
                      <span className="hidden sm:inline">Scan</span>
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1.5">
                    Click &quot;Scan QR Code&quot; to scan live with your camera, or paste/type the code manually.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={scanQRMutation.isPending}
                  className="w-full text-xs font-semibold h-10 gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  {scanQRMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Token...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>Verify &amp; Mark Present</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mode B Flow */}
      {checkInMode === 'MODE_B' && (
    <>

      {/* STEP 1: ENTER_CODE */}
      {step === 'ENTER_CODE' && (
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Step 1: Enter Attendance Code</CardTitle>
            <CardDescription className="text-xs text-slate-500 font-medium">
              Input the 6-digit passcode displayed by your instructor. The camera will only activate
              after the code and window are confirmed valid.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Face Enrollment Required Warning for Mode B */}
            {faceStatus && !faceStatus.enrolled && (
              <div className="mb-4 p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-amber-950">Biometric Profile Required for Mode B</p>
                    <p className="text-[11px] text-amber-800 font-medium">
                      You must enroll your face first to use Mode B attendance, or switch to Direct QR check-in.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/student/enroll-face')}
                  className="h-8 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 flex-shrink-0 font-semibold"
                >
                  Enroll Face
                </Button>
              </div>
            )}

            <form onSubmit={handleCheckCode} className="space-y-4">
              {preCheckError && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2 shadow-2xs">
                  <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Code Verification Failed</p>
                    <p className="mt-0.5 text-[11px] font-medium">{preCheckError}</p>
                  </div>
                </div>
              )}

              {/* Session Selector or Manual Input */}
              <div>
                <label className="text-xs font-bold text-slate-800 mb-1.5 block">
                  Select Live Session or Enter Session UUID
                </label>
                <div className="space-y-2">
                  {activeSessions && activeSessions.length > 0 ? (
                    <select
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                      className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer shadow-2xs"
                    >
                      <option value="">-- Choose active lecture session --</option>
                      {activeSessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.course.code} — {s.title} (Active Now)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium flex items-center justify-between">
                      <span>No live attendance sessions active right now for your courses.</span>
                      <span className="font-mono text-[10px] text-slate-500">Manual entry below</span>
                    </div>
                  )}

                  <Input
                    placeholder="Session ID (UUID)"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="font-mono text-xs bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              {/* 6-Digit Code Input */}
              <div>
                <label className="text-xs font-bold text-slate-800 mb-1.5 block">
                  6-Digit Rotating Attendance Code
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 582914"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="h-12 text-center font-mono text-2xl tracking-widest bg-slate-50 font-extrabold border-2 border-blue-400 text-slate-900 focus:bg-white shadow-inner"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Enter the numeric passcode currently displayed on the classroom screen.
                </p>
              </div>

              <Button
                type="submit"
                disabled={checkCodeMutation.isPending || code.length < 6 || !sessionId}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2 mt-2 h-10 shadow-xs"
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
        <Card className="border-slate-200 bg-white shadow-xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 text-center">
            <div className="inline-flex items-center justify-center gap-1.5 text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full mx-auto mb-1 font-semibold shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Passcode Accepted ({secondsLeft ? `${secondsLeft}s window` : 'Window Active'})</span>
            </div>
            <CardTitle className="text-lg font-bold text-slate-900">Blink Once or Twice</CardTitle>
            <CardDescription className="text-xs text-slate-500 font-medium">{faceHint}</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center pt-4 space-y-4">
            {/* Viewport */}
            <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 ${cameraActive ? 'block' : 'hidden'
                  }`}
              />

              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 ${cameraActive ? 'block' : 'hidden'
                  }`}
              />

              {!cameraActive && (
                <div className="text-center p-6 text-slate-500 text-sm space-y-3">
                  <Camera className="w-10 h-10 mx-auto opacity-40 text-slate-400 animate-pulse" />
                  <p className="text-xs text-slate-400 font-medium">
                    {cameraError || 'Initializing biometric camera...'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSimulateBlinkCapture}
                    className="text-xs font-mono border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold gap-1.5 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
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
            <div className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 flex items-center justify-between font-medium">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  {blinkDetected
                    ? 'Blink verified! Saving facial descriptor vector...'
                    : livenessTimedOut
                      ? '8-second limit reached. Continuing for review...'
                      : `Please blink naturally. Auto-capturing (${captureCountdown}s left)`}
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-slate-300 text-slate-600 font-semibold"
              >
                {blinkDetected ? 'Liveness: OK' : `${captureCountdown}s`}
              </Badge>
            </div>

            {/* Action Buttons */}
            {cameraActive && (
              <div className="w-full flex items-center justify-between gap-3 pt-1">
                <Button
                  type="button"
                  onClick={handleManualCapture}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-2 h-9 shadow-xs"
                >
                  <ScanFace className="w-4 h-4" />
                  Capture Face & Verify
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSimulateBlinkCapture}
                  className="text-xs font-mono border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold gap-1.5 h-9 shadow-2xs"
                  title="Simulate random vector (for offline testing without camera)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Simulate
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 3: RESULT */}
      {step === 'RESULT' && (
        <Card className="border-slate-200 bg-white shadow-xl overflow-hidden">
          <CardHeader className="text-center pb-4 border-b border-slate-100">
            {markAttendanceMutation.isPending ? (
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-2">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : markResult?.status === 'PRESENT' ? (
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center text-emerald-600 mb-2 shadow-2xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            ) : markResult?.status === 'FLAGGED' ? (
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-600 mb-2 shadow-2xs">
                <AlertTriangle className="w-7 h-7" />
              </div>
            ) : (
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 border border-rose-300 flex items-center justify-center text-rose-600 mb-2 shadow-2xs">
                <XCircle className="w-7 h-7" />
              </div>
            )}

            <CardTitle className="text-xl font-extrabold text-slate-900">
              {markAttendanceMutation.isPending
                ? 'Processing Attendance Verification...'
                : markResult?.status === 'PRESENT'
                  ? 'Attendance Verified: PRESENT'
                  : markResult?.status === 'FLAGGED'
                    ? 'Attendance Status: FLAGGED'
                    : 'Verification Rejected'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 font-medium">
              Biometric Euclidean distance & campus network integrity evaluation
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-5">
            {markAttendanceMutation.isPending ? (
              <div className="text-center py-6 text-xs text-slate-600 font-mono space-y-2">
                <p className="font-semibold">Verifying 128-dimensional embedding against registered profile...</p>
                <p className="text-[11px] text-slate-500">Camera hardware has been fully shut down.</p>
              </div>
            ) : markResult ? (
              <div className="space-y-4">
                {/* Status Box */}
                <div
                  className={`p-4 rounded-xl border ${markResult.status === 'PRESENT'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge
                        className={
                          markResult.status === 'PRESENT'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-mono font-bold mb-2'
                            : 'bg-amber-100 text-amber-800 border-amber-300 text-xs font-mono font-bold mb-2'
                        }
                      >
                        {markResult.status}
                      </Badge>
                      <p className="text-sm font-bold">{markResult.message}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] uppercase font-mono text-slate-500 font-semibold">Integrity Score</p>
                      <p className="text-2xl font-black font-mono mt-0.5 text-slate-900">
                        {Math.round(markResult.integrityScore * 100)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2 font-mono">
                  <div className="flex justify-between items-center text-slate-600 font-medium">
                    <span>Attendance Method:</span>
                    <span className="text-slate-900 font-bold">SELF (Short-Window Mode B)</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 font-medium">
                    <span>Camera Status:</span>
                    <span className="text-emerald-700 font-bold">Off (Hardware indicator light off)</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 font-medium">
                    <span>Privacy Policy:</span>
                    <span className="text-slate-900 font-bold">Zero Image Storage (Vectors Only)</span>
                  </div>
                </div>
              </div>
            ) : markError ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 space-y-2 shadow-xs">
                <p className="text-sm font-bold">Attendance Rejected by Server</p>
                <p className="text-xs font-medium">{markError}</p>
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="default"
                onClick={() => navigate('/student')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              >
                Return to Dashboard
              </Button>

              <Button
                variant="outline"
                onClick={handleReset}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold gap-1.5 shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Mark Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
        </>
      )}

      {/* In-App QR Scanner Dialog */}
      <QrScannerDialog
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        onScanSuccess={handleQrScanSuccess}
      />
    </div>
  );
};
