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
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Student Dashboard
        </Button>

        <div className="flex items-center gap-2">
          {statusLoading ? (
            <Badge variant="outline" className="text-xs font-mono border-slate-300 text-slate-600 font-medium">
              Checking status...
            </Badge>
          ) : isAlreadyEnrolled ? (
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-mono font-semibold flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Biometrics Active & Enrolled
            </Badge>
          ) : (
            <Badge className="bg-amber-50 text-amber-800 border border-amber-300 text-xs font-mono font-semibold flex items-center gap-1.5 shadow-2xs">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Enrollment Required
            </Badge>
          )}
        </div>
      </div>

      {/* Main Header Card */}
      <div className="rounded-xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/50 border border-slate-200 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100/80 text-blue-800 border border-blue-200 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Academic Identity & Verification
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Enroll Facial Biometrics
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 max-w-2xl leading-relaxed font-medium">
              Register your facial biometric descriptor to enable instant one-touch attendance
              verification in lecture halls and laboratory sessions.
            </p>
          </div>

          <div className="flex-shrink-0">
            <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-3 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-200">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-slate-500 font-mono text-[11px] font-medium">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success / Status Banner */}
      {submissionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all shadow-xs ${
            submissionMessage.success
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {submissionMessage.success ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          )}
          <div className="flex-1 text-sm">
            <p className="font-bold">
              {submissionMessage.success ? 'Enrollment Completed' : 'Enrollment Notice'}
            </p>
            <p className="text-xs mt-0.5 font-medium">{submissionMessage.text}</p>
          </div>
        </div>
      )}

      {/* Privacy Guarantees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-start gap-3 shadow-2xs">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <EyeOff className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Zero Image Storage</h4>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-relaxed">
              No photographs or videos are ever uploaded or saved on our servers.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-start gap-3 shadow-2xs">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Binary className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Vector Embeddings Only</h4>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-relaxed">
              Only a one-way 128-float mathematical embedding is retained.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-start gap-3 shadow-2xs">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Encrypted & Restricted</h4>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-relaxed">
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
            <Card className="border-emerald-200 bg-emerald-50/70 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>3 Frames Averaged: 128-d Vector Ready</span>
                </div>
                <span className="text-slate-600 font-medium text-[11px]">
                  Sample: [{capturedDescriptor.slice(0, 3).map((n) => n.toFixed(3)).join(', ')}, ...]
                </span>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Consent Agreement & Submission Form */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Biometric Consent & Authorization
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 font-medium">
                In compliance with biometric privacy regulations, your explicit consent is mandatory.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>Data Processing Agreement:</span>
                </div>
                <p className="text-slate-600 font-medium text-[11px]">
                  1. The client-side neural network processes video frames locally in your browser to
                  extract facial landmark geometries.
                </p>
                <p className="text-slate-600 font-medium text-[11px]">
                  2. Exactly 3 frames are captured and mathematically averaged into a single 128-dimensional
                  feature vector.
                </p>
                <p className="text-slate-600 font-medium text-[11px]">
                  3. The server stores only the 128 numerical values in your encrypted profile. Photographs
                  and video are strictly discarded.
                </p>
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-start gap-3 p-3.5 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-50/80 transition-colors">
                <Checkbox
                  id="biometric-consent-checkbox"
                  checked={consentGiven}
                  onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
                  className="mt-0.5 border-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                />
                <label
                  htmlFor="biometric-consent-checkbox"
                  className="text-xs font-semibold text-slate-900 cursor-pointer select-none leading-snug"
                >
                  I consent to the capture of my facial biometric descriptor for attendance
                  verification purposes. I understand that the server stores the descriptor vector only
                  and does not store images.
                </label>
              </div>

              {/* Requirement Checklist */}
              <div className="space-y-1.5 pt-1 text-xs font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">1. Consent Checkbox:</span>
                  <span className={consentGiven ? 'text-emerald-700 font-bold' : 'text-slate-400 font-semibold'}>
                    {consentGiven ? 'Accepted ✓' : 'Required ✕'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">2. 3-Frame Capture:</span>
                  <span className={capturedDescriptor ? 'text-emerald-700 font-bold' : 'text-slate-400 font-semibold'}>
                    {capturedDescriptor ? 'Sampled & Averaged ✓' : 'Pending Capture ✕'}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                onClick={handleSubmitEnrollment}
                disabled={!consentGiven || !capturedDescriptor || enrollMutation.isPending}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                size="default"
              >
                {enrollMutation.isPending ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Enrolling Descriptor Vector...
                  </>
                ) : isAlreadyEnrolled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-300" />
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
                <p className="text-[11px] text-center text-slate-500 font-medium">
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
