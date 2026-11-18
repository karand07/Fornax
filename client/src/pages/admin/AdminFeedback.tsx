import React from 'react';
import { Check, AlertCircle, X } from 'lucide-react';

export interface FeedbackState {
  type: 'success' | 'error';
  text: string;
}

interface AdminFeedbackProps {
  feedback: FeedbackState | null;
  onDismiss: () => void;
}

export const AdminFeedback: React.FC<AdminFeedbackProps> = ({ feedback, onDismiss }) => {
  if (!feedback) return null;

  const isSuccess = feedback.type === 'success';

  return (
    <div
      className={`p-3 rounded-md text-xs border flex items-center gap-2 ${
        isSuccess
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-red-500/10 border-red-500/30 text-red-400'
      }`}
    >
      {isSuccess ? (
        <Check className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      )}
      <span className="flex-1">{feedback.text}</span>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-200 ml-2 shrink-0 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
