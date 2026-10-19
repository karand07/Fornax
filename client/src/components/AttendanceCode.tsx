import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, ShieldCheck } from 'lucide-react';

interface AttendanceCodeProps {
  sessionTitle: string;
  courseCode: string;
  qrCodeToken: string;
  sessionId: string;
}

export const AttendanceCode: React.FC<AttendanceCodeProps> = ({
  sessionTitle,
  courseCode,
  qrCodeToken,
  sessionId,
}) => {
  const qrData = JSON.stringify({
    sessionId,
    qrCodeToken,
  });

  return (
    <Card className="max-w-md mx-auto border-border bg-card shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center items-center gap-2 mb-2">
          <Badge variant="default">
            {courseCode}
          </Badge>
          <Badge variant="success" className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Active Session
          </Badge>
        </div>
        <CardTitle className="text-xl font-bold text-slate-100">{sessionTitle}</CardTitle>
        <CardDescription>Scan this QR code with the student portal to record attendance</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center p-6 pt-2">
        <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">
          <QRCodeSVG value={qrData} size={220} level="H" includeMargin={true} />
        </div>
        <div className="mt-4 flex items-center justify-between w-full text-xs text-slate-400 px-2">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" /> Auto-updates token
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Cryptographically Signed
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
