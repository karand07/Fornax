import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  UserX,
  ScanFace,
  Loader2,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
  Info,
} from 'lucide-react';
import { loadClassPhotoModels, areClassPhotoModelsLoaded } from '@/lib/faceApi';
import { photoToDescriptors } from '@/lib/classPhoto';
import {
  useClassPhotoAttendance,
  useManualAttendance,
  useReviewAttendanceRecord,
  ClassPhotoResult,
} from '@/api/hooks';

interface CapturedPhotoItem {
  id: string;
  dataUrl: string;
  descriptors: number[][];
  facesCount: number;
}

interface ClassPhotoDialogProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onAttendanceUpdated?: () => void;
}

export const ClassPhotoDialog: React.FC<ClassPhotoDialogProps> = ({
  sessionId,
  isOpen,
  onClose,
  onAttendanceUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload');
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // Photos state
  const [photos, setPhotos] = useState<CapturedPhotoItem[]>([]);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);

  // Result state
  const [matchResult, setMatchResult] = useState<ClassPhotoResult | null>(null);
  const [resultTab, setResultTab] = useState<'present' | 'review' | 'notfound'>('present');

  // Webcam stream state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Review & manual action states for UI feedback
  const [reviewedAction, setReviewedAction] = useState<Record<string, 'APPROVED' | 'REJECTED'>>({});
  const [markedPresentIds, setMarkedPresentIds] = useState<Record<string, boolean>>({});

  // Mutations
  const classPhotoMutation = useClassPhotoAttendance();
  const manualAttendanceMutation = useManualAttendance();
  const reviewRecordMutation = useReviewAttendanceRecord();

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, [cameraStream]);

  // Load models lazily when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (!areClassPhotoModelsLoaded()) {
        setModelsLoading(true);
        loadClassPhotoModels('/models')
          .then(() => setModelsLoading(false))
          .catch((err) => {
            console.error('Error loading class photo models:', err);
            setModelError('Failed to load neural face detection models. Please refresh.');
            setModelsLoading(false);
          });
      }
    } else {
      // Dialog closed: stop camera and cleanup
      stopCamera();
    }
  }, [isOpen, stopCamera]);

  // Handle camera start
  const startCamera = async () => {
    setCameraError(null);
    try {
      stopCamera();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
      } catch {
        // Fallback for laptops/desktops without environment camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not access camera';
      setCameraError(msg);
      setIsCameraActive(false);
    }
  };

  // Manage camera based on tab switch
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, isOpen]);

  // Stop camera on unmount or dialog close
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  // Capture frame from webcam
  const captureWebcamFrame = async () => {
    if (!videoRef.current || photos.length >= 5 || processingPhoto) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    setProcessingPhoto(true);
    setProcessingProgress(25);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      setProcessingProgress(60);
      const descriptors = await photoToDescriptors(canvas);

      // Create thumbnail data url (scaled down to save memory)
      const thumbCanvas = document.createElement('canvas');
      const thumbWidth = 240;
      const thumbHeight = Math.round((canvas.height * thumbWidth) / canvas.width);
      thumbCanvas.width = thumbWidth;
      thumbCanvas.height = thumbHeight;
      const thumbCtx = thumbCanvas.getContext('2d');
      if (thumbCtx) {
        thumbCtx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);
      }
      const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);

      // Clean canvases
      canvas.width = 0;
      canvas.height = 0;
      thumbCanvas.width = 0;
      thumbCanvas.height = 0;

      const newPhoto: CapturedPhotoItem = {
        id: crypto.randomUUID(),
        dataUrl,
        descriptors,
        facesCount: descriptors.length,
      };

      setPhotos((prev) => [...prev, newPhoto]);
      setProcessingProgress(100);
    } catch (err: unknown) {
      console.error('Failed to process webcam frame:', err);
      alert('Error detecting faces in captured frame.');
    } finally {
      setProcessingPhoto(false);
      setProcessingProgress(0);
    }
  };

  // Handle file uploads
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - photos.length;
    if (remainingSlots <= 0) {
      alert('Maximum 5 photos allowed.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    setProcessingPhoto(true);

    try {
      for (let i = 0; i < filesToProcess.length; i++) {
        setProcessingProgress(Math.round(((i + 1) / filesToProcess.length) * 100));
        const file = filesToProcess[i];

        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = objectUrl;
        });

        const descriptors = await photoToDescriptors(img);

        // Generate thumbnail
        const thumbCanvas = document.createElement('canvas');
        const thumbWidth = 240;
        const thumbHeight = Math.round((img.naturalHeight * thumbWidth) / img.naturalWidth);
        thumbCanvas.width = thumbWidth;
        thumbCanvas.height = thumbHeight;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
        }
        const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);

        // Revoke object URL immediately
        URL.revokeObjectURL(objectUrl);
        thumbCanvas.width = 0;
        thumbCanvas.height = 0;

        setPhotos((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            dataUrl,
            descriptors,
            facesCount: descriptors.length,
          },
        ]);
      }
    } catch (err: unknown) {
      console.error('Error processing photos:', err);
      alert('Error detecting faces in one or more photos.');
    } finally {
      setProcessingPhoto(false);
      setProcessingProgress(0);
      e.target.value = '';
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleRunMatching = async () => {
    if (photos.length === 0) return;
    try {
      const descriptorsPayload = photos.map((p) => p.descriptors);
      const res = await classPhotoMutation.mutateAsync({
        sessionId,
        photos: descriptorsPayload,
      });
      setMatchResult(res);
      onAttendanceUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Class photo matching failed';
      alert(msg);
    }
  };

  const handleApproveRecord = async (recordId: string) => {
    try {
      await reviewRecordMutation.mutateAsync({ recordId, status: 'PRESENT' });
      setReviewedAction((prev) => ({ ...prev, [recordId]: 'APPROVED' }));
      onAttendanceUpdated?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to approve record');
    }
  };

  const handleRejectRecord = async (recordId: string) => {
    try {
      await reviewRecordMutation.mutateAsync({ recordId, status: 'ABSENT' });
      setReviewedAction((prev) => ({ ...prev, [recordId]: 'REJECTED' }));
      onAttendanceUpdated?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to reject record');
    }
  };

  const handleMarkPresent = async (studentId: string) => {
    try {
      await manualAttendanceMutation.mutateAsync({
        sessionId,
        studentId,
        status: 'PRESENT',
      });
      setMarkedPresentIds((prev) => ({ ...prev, [studentId]: true }));
      onAttendanceUpdated?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to mark present');
    }
  };

  const resetAll = () => {
    setPhotos([]);
    setMatchResult(null);
    setReviewedAction({});
    setMarkedPresentIds({});
    setActiveTab('upload');
  };

  const presentMatches = matchResult?.matched.filter((m) => m.status === 'PRESENT') || [];
  const flaggedMatches = matchResult?.flagged || [];
  const notFoundStudents = matchResult?.notFound || [];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          stopCamera();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-900 p-6 shadow-xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs">
                <ScanFace className="w-5 h-5" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900">Class Photo Attendance</DialogTitle>
            </div>
            {matchResult && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetAll}
                className="text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                New Photo
              </Button>
            )}
          </div>
          <DialogDescription className="text-slate-500 text-sm font-medium">
            Capture or upload up to 5 photos of the classroom to detect and match enrolled students.
          </DialogDescription>
        </DialogHeader>

        {/* Privacy Note */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>
            Privacy Guarantee: Photos are processed entirely in your browser. Raw images are never
            uploaded or stored on any server.
          </span>
        </div>

        {modelsLoading && (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center gap-3 text-slate-700 text-sm font-medium">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Loading biometric facial detection models...</span>
          </div>
        )}

        {modelError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{modelError}</span>
          </div>
        )}

        {/* Processing Progress */}
        {processingPhoto && (
          <div className="space-y-2 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex justify-between items-center text-xs text-slate-700 font-medium">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                Detecting faces in photo...
              </span>
              <span>{processingProgress}%</span>
            </div>
            <Progress value={processingProgress} className="h-1.5" />
          </div>
        )}

        {/* MAIN BODY: MATCH RESULT SCREEN OR CAPTURE INTERFACE */}
        {matchResult ? (
          /* RESULT SCREEN */
          <div className="space-y-5">
            {/* Summary Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-center p-2 rounded-lg bg-emerald-50 border border-emerald-200 shadow-2xs">
                <div className="text-2xl font-bold text-emerald-700">
                  {presentMatches.length}
                </div>
                <div className="text-xs text-slate-600 font-semibold">Present</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-50 border border-amber-200 shadow-2xs">
                <div className="text-2xl font-bold text-amber-700">
                  {flaggedMatches.length}
                </div>
                <div className="text-xs text-slate-600 font-semibold">To Review</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <div className="text-2xl font-bold text-slate-800">
                  {notFoundStudents.length}
                </div>
                <div className="text-xs text-slate-600 font-semibold">Not Found</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-purple-50 border border-purple-200 shadow-2xs">
                <div className="text-2xl font-bold text-purple-700">
                  {matchResult.unknownFaces}
                </div>
                <div className="text-xs text-slate-600 font-semibold">Unknown Faces</div>
              </div>
            </div>

            {/* Results Tabs */}
            <Tabs
              value={resultTab}
              onValueChange={(val) => setResultTab(val as typeof resultTab)}
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 bg-slate-100 border border-slate-200 p-1">
                <TabsTrigger
                  value="present"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-semibold gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Present ({presentMatches.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="review"
                  className="data-[state=active]:bg-amber-600 data-[state=active]:text-white font-semibold gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Needs Review ({flaggedMatches.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="notfound"
                  className="data-[state=active]:bg-slate-800 data-[state=active]:text-white font-semibold gap-1.5"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Not Found ({notFoundStudents.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* Present Tab */}
              <TabsContent value="present" className="mt-3">
                {presentMatches.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-lg">
                    No students met the direct PRESENT threshold (distance &lt; 0.50).
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow className="border-b border-slate-200 hover:bg-transparent">
                          <TableHead className="text-slate-700 font-bold">Student Name</TableHead>
                          <TableHead className="text-slate-700 font-bold">Biometric Distance</TableHead>
                          <TableHead className="text-slate-700 font-bold">Integrity Score</TableHead>
                          <TableHead className="text-slate-700 font-bold text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {presentMatches.map((m) => (
                          <TableRow key={m.studentId} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <TableCell className="font-bold text-slate-900">
                              {m.name}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-600 font-medium">
                              {m.distance.toFixed(3)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold"
                              >
                                {Math.round(m.integrityScore * 100)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-emerald-600 text-white font-semibold shadow-2xs">
                                PRESENT
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Needs Review Tab */}
              <TabsContent value="review" className="mt-3">
                {flaggedMatches.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 border border-dashed border-slate-300 rounded-lg">
                    No flagged records requiring review.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow className="border-b border-slate-200 hover:bg-transparent">
                          <TableHead className="text-slate-700 font-bold">Student Name</TableHead>
                          <TableHead className="text-slate-700 font-bold">Biometric Distance</TableHead>
                          <TableHead className="text-slate-700 font-bold">Reason</TableHead>
                          <TableHead className="text-slate-700 font-bold text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flaggedMatches.map((m) => {
                          const action = reviewedAction[m.recordId];
                          return (
                            <TableRow key={m.studentId} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <TableCell className="font-bold text-slate-900">
                                {m.name}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-amber-700 font-bold">
                                {m.distance.toFixed(3)}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600 font-medium">
                                Distance 0.50 – 0.60 (borderline match)
                              </TableCell>
                              <TableCell className="text-right">
                                {action ? (
                                  <Badge
                                    className={
                                      action === 'APPROVED'
                                        ? 'bg-emerald-600 text-white font-semibold'
                                        : 'bg-rose-600 text-white font-semibold'
                                    }
                                  >
                                    {action === 'APPROVED' ? 'Approved' : 'Rejected'}
                                  </Badge>
                                ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={reviewRecordMutation.isPending}
                                      onClick={() => handleApproveRecord(m.recordId)}
                                      className="h-8 px-2.5 text-xs bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-semibold shadow-2xs"
                                    >
                                      <Check className="w-3.5 h-3.5 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={reviewRecordMutation.isPending}
                                      onClick={() => handleRejectRecord(m.recordId)}
                                      className="h-8 px-2.5 text-xs bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 font-semibold shadow-2xs"
                                    >
                                      <X className="w-3.5 h-3.5 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Not Found Tab */}
              <TabsContent value="notfound" className="mt-3">
                {notFoundStudents.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-lg">
                    All enrolled students were successfully matched!
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow className="border-b border-slate-200 hover:bg-transparent">
                          <TableHead className="text-slate-700 font-bold">Enrolled Student</TableHead>
                          <TableHead className="text-slate-700 font-bold">Face Status</TableHead>
                          <TableHead className="text-slate-700 font-bold text-right">Manual Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notFoundStudents.map((s) => {
                          const isMarked = markedPresentIds[s.studentId];
                          return (
                            <TableRow key={s.studentId} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <TableCell className="font-bold text-slate-900">
                                {s.name}
                              </TableCell>
                              <TableCell>
                                {s.hasFaceEnrolled ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-slate-100 text-slate-600 border-slate-200 text-xs font-semibold"
                                  >
                                    Face Enrolled (Not in Photo)
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-50 text-amber-800 border-amber-300 text-xs font-semibold"
                                  >
                                    No face enrolled
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {isMarked ? (
                                  <Badge className="bg-emerald-600 text-white font-semibold">
                                    Marked Present
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={manualAttendanceMutation.isPending}
                                    onClick={() => handleMarkPresent(s.studentId)}
                                    className="h-8 px-3 text-xs border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-2xs"
                                  >
                                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                    Mark present
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Skipped information */}
            {matchResult.skipped && matchResult.skipped.length > 0 && (
              <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Preserved Existing Records:
                </div>
                {matchResult.skipped.map((sk) => (
                  <div key={sk.studentId} className="pl-5 text-slate-400">
                    • <span className="text-slate-200">{sk.name}</span>: {sk.reason}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* CAPTURE / UPLOAD INTERFACE */
          <div className="space-y-4">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as typeof activeTab)}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 bg-slate-100 border border-slate-200">
                <TabsTrigger value="upload" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 font-semibold">
                  <Upload className="w-4 h-4" />
                  Upload Photos
                </TabsTrigger>
                <TabsTrigger value="camera" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 font-semibold">
                  <Camera className="w-4 h-4" />
                  Webcam Capture
                </TabsTrigger>
              </TabsList>

              {/* Upload Tab */}
              <TabsContent value="upload" className="mt-4 space-y-4">
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center transition-colors bg-slate-50">
                  <input
                    type="file"
                    id="class-photo-file-input"
                    accept="image/*"
                    multiple
                    capture="environment"
                    onChange={handleFileUpload}
                    disabled={photos.length >= 5 || processingPhoto}
                    className="hidden"
                  />
                  <label
                    htmlFor="class-photo-file-input"
                    className={`cursor-pointer flex flex-col items-center justify-center gap-2 ${
                      photos.length >= 5 ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      Click to upload classroom photos
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      PNG, JPG, WebP up to 5 photos total. Phones will offer camera capture.
                    </div>
                  </label>
                </div>
              </TabsContent>

              {/* Webcam Tab */}
              <TabsContent value="camera" className="mt-4 space-y-4">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/80 text-center text-sm text-red-300 gap-2">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                      <span>{cameraError}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={startCamera}
                        className="mt-2 text-xs bg-white text-slate-900 border-slate-300"
                      >
                        Try Again
                      </Button>
                    </div>
                  )}

                  {!isCameraActive && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-slate-300 text-sm">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-400 mr-2" />
                      Initializing camera...
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    onClick={captureWebcamFrame}
                    disabled={!isCameraActive || photos.length >= 5 || processingPhoto}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Take Photo ({photos.length}/5)
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      stopCamera();
                      setActiveTab('upload');
                    }}
                    className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                  >
                    Done taking photos
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Thumbnail Preview Area */}
            {photos.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>Captured Photos ({photos.length} of 5)</span>
                  <span className="text-slate-500 font-medium">
                    Total faces found:{' '}
                    {photos.reduce((sum, p) => sum + p.facesCount, 0)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {photos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="group relative rounded-lg border border-slate-200 overflow-hidden bg-slate-100 aspect-[4/3] shadow-xs"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={`Classroom photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-2">
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="self-end p-1 rounded-full bg-black/60 text-white hover:text-red-400 hover:bg-black/90 transition-colors"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <Badge
                          variant="outline"
                          className="self-start text-[10px] py-0 px-1.5 bg-black/70 border-slate-700 text-emerald-400 font-semibold"
                        >
                          {photo.facesCount} faces found
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Run Matching Button */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <span className="text-xs text-slate-600 font-medium">
                {photos.length === 0
                  ? 'Add at least 1 photo to run facial matching'
                  : `${photos.length} photo(s) ready for facial matching`}
              </span>
              <Button
                type="button"
                onClick={handleRunMatching}
                disabled={photos.length === 0 || classPhotoMutation.isPending || processingPhoto}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold min-w-[140px] shadow-xs"
              >
                {classPhotoMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Matching...
                  </>
                ) : (
                  <>
                    <ScanFace className="w-4 h-4 mr-2" />
                    Run Matching
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClassPhotoDialog;
