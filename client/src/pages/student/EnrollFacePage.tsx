import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth-context';
import { useEnrollFace, useFaceStatus } from '@/api/hooks';
import { FaceCapture } from '@/components/FaceCapture';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Lock,
  EyeOff,
  Binary,
  Sparkles,
  Info,
} from 'lucide-react';

export const EnrollFacePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: statusData, isLoading: statusLoading } = useFaceStatus();
  const enrollMutation = useEnrollFace();

  const [consentGiven, setConsentGiven] = useState(false);
  const [capturedDescriptor, setCapturedDescriptor] = useState<number[] | null>(null);
  const [submissionMessage, setSubmissionMessage] = useState<{
    text: string;
    success: boolean;
  } | null>(null);

  const isAlreadyEnrolled = statusData?.enrolled;

  const handleCaptureComplete = (descriptor: number[]) => {
    setCapturedDescriptor(descriptor);
    setSubmissionMessage(null);
  };

  const handleSubmitEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!consentGiven) {
      setSubmissionMessage({
        text: 'Please review and accept the biometric data privacy consent before enrolling.',
        success: false,
      });
      return;
    }

    if (!capturedDescriptor || capturedDescriptor.length === 0) {
      setSubmissionMessage({
        text: 'Please complete the 3-frame biometric face capture first.',
        success: false,
      });
      return;
    }

    try {
      const response = await enrollMutation.mutateAsync({
        descriptor: capturedDescriptor,
        consent: consentGiven,
      });

      setSubmissionMessage({
        text: response.message || 'Biometric facial profile enrolled successfully!',
        success: true,
      });
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to enroll face profile. Please check your network and try again.';
      setSubmissionMessage({
        text: errorMsg,
        success: false,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/student')}
          className="text-xs text-slate-400 hover:text-slate-200 gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Student Dashboard
        </Button>

        <div className="flex items-center gap-2">
          {statusLoading ? (
            <Badge variant="outline" className="text-xs font-mono border-slate-700 text-slate-400">
              Checking status...
            </Badge>
          ) : isAlreadyEnrolled ? (
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Biometrics Active & Enrolled
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-mono flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Enrollment Required
            </Badge>
          )}
        </div>
      </div>

      {/* Main Header Card */}
      <div className="rounded-xl bg-gradient-to-r from-blue-950/40 via-card to-card border border-border p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Academic Identity & Verification
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
              Enroll Facial Biometrics
            </h1>
            <p className="mt-1.5 text-sm text-slate-400 max-w-2xl leading-relaxed">
              Register your facial biometric descriptor to enable instant one-touch attendance
              verification in lecture halls and laboratory sessions.
            </p>
          </div>

          <div className="flex-shrink-0">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/30">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-200">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-slate-400 font-mono text-[11px]">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success / Status Banner */}
      {submissionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            submissionMessage.success
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          {submissionMessage.success ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          )}
          <div className="flex-1 text-sm">
            <p className="font-medium">
              {submissionMessage.success ? 'Enrollment Completed' : 'Enrollment Notice'}
            </p>
            <p className="text-xs mt-0.5 opacity-90">{submissionMessage.text}</p>
          </div>
        </div>
      )}

      {/* Privacy Guarantees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-lg bg-card/60 border border-border flex items-start gap-3">
          <div className="p-2 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <EyeOff className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-200">Zero Image Storage</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              No photographs or videos are ever uploaded or saved on our servers.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-card/60 border border-border flex items-start gap-3">
          <div className="p-2 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Binary className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-200">Vector Embeddings Only</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Only a one-way 128-float mathematical embedding is retained.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-card/60 border border-border flex items-start gap-3">
          <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-200">Encrypted & Restricted</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Accessible exclusively for attendance verification during your registered classes.
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Camera / Capture on Left, Consent & Enrollment on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Biometric Capture Component */}
        <div className="lg:col-span-7 space-y-4">
          <FaceCapture
            title="Biometric Scanner (face-api.js)"
            description="Our neural network samples 3 discrete frames to compute a normalized facial descriptor vector"
            buttonLabel="Start 3-Frame Capture Sequence"
            onCapture={handleCaptureComplete}
          />

          {capturedDescriptor && (
            <Card className="border-border bg-slate-900/50">
              <CardContent className="p-4 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>3 Frames Averaged: 128-d Vector Ready</span>
                </div>
                <span className="text-slate-500 text-[11px]">
                  Sample: [{capturedDescriptor.slice(0, 3).map((n) => n.toFixed(3)).join(', ')}, ...]
                </span>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Consent Agreement & Submission Form */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border bg-card shadow-lg">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Biometric Consent & Authorization
              </CardTitle>
              <CardDescription className="text-xs">
                In compliance with biometric privacy regulations, your explicit consent is mandatory.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  <span>Data Processing Agreement:</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  1. The client-side neural network processes video frames locally in your browser to
                  extract facial landmark geometries.
                </p>
                <p className="text-slate-400 text-[11px]">
                  2. Exactly 3 frames are captured and mathematically averaged into a single 128-dimensional
                  feature vector.
                </p>
                <p className="text-slate-400 text-[11px]">
                  3. The server stores only the 128 numerical values in your encrypted profile. Photographs
                  and video are strictly discarded.
                </p>
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-start gap-3 p-3.5 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
                <Checkbox
                  id="biometric-consent-checkbox"
                  checked={consentGiven}
                  onCheckedChange={(checked) => setConsentGiven(checked)}
                  className="mt-0.5 border-blue-400/50"
                />
                <label
                  htmlFor="biometric-consent-checkbox"
                  className="text-xs font-medium text-slate-200 cursor-pointer select-none leading-snug"
                >
                  I consent to the capture of my facial biometric descriptor for attendance
                  verification purposes. I understand that the server stores the descriptor vector only
                  and does not store images.
                </label>
              </div>

              {/* Requirement Checklist */}
              <div className="space-y-1.5 pt-1 text-xs font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">1. Consent Checkbox:</span>
                  <span className={consentGiven ? 'text-emerald-400' : 'text-slate-500'}>
                    {consentGiven ? 'Accepted ✓' : 'Required ✕'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">2. 3-Frame Capture:</span>
                  <span className={capturedDescriptor ? 'text-emerald-400' : 'text-slate-500'}>
                    {capturedDescriptor ? 'Sampled & Averaged ✓' : 'Pending Capture ✕'}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                onClick={handleSubmitEnrollment}
                disabled={!consentGiven || !capturedDescriptor || enrollMutation.isPending}
                className="w-full mt-2"
                size="default"
              >
                {enrollMutation.isPending ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Enrolling Descriptor Vector...
                  </>
                ) : isAlreadyEnrolled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />
                    Update Enrolled Face Descriptor
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Complete Face Enrollment
                  </>
                )}
              </Button>

              {!consentGiven && (
                <p className="text-[11px] text-center text-slate-500">
                  Check the consent box above to enable enrollment.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
