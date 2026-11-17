import React, { useState } from 'react';
import { Wifi, ScanFace } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const SecurityTab: React.FC = () => {
  const [testIp, setTestIp] = useState('192.168.1.105');
  const [allowedSubnets, setAllowedSubnets] = useState('192.168.1., 10.0.0., 127.0.0.1');
  const [testFaceDist, setTestFaceDist] = useState('0.38');
  const [testLiveness, setTestLiveness] = useState(true);

  // Calculate subnet verification
  const ipPrefixList = allowedSubnets
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const isIpAllowed = ipPrefixList.some((prefix) => testIp.startsWith(prefix));

  // Mode B attendance rule engine calculation (§5.4 spec)
  const distNum = parseFloat(testFaceDist) || 0;
  const isDistanceAccepted = distNum < 0.6;
  let simulatedStatus: 'PRESENT' | 'FLAGGED' | 'REJECTED' = 'FLAGGED';
  let simulatedIntegrity = 0.5;

  if (distNum >= 0.6) {
    simulatedStatus = 'REJECTED';
    simulatedIntegrity = 0.0;
  } else if (distNum < 0.45 && testLiveness && isIpAllowed) {
    simulatedStatus = 'PRESENT';
    simulatedIntegrity = 1.0;
  } else if (distNum < 0.45) {
    simulatedStatus = 'FLAGGED';
    simulatedIntegrity = testLiveness ? 0.85 : 0.75;
  } else {
    simulatedStatus = 'FLAGGED';
    simulatedIntegrity = testLiveness ? 0.83 : 0.68;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Subnet & Network Boundary Simulator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wifi className="w-4 h-4 text-blue-400" /> Network IP Range Simulator
          </CardTitle>
          <CardDescription>
            Test student attendance submissions against institutional allowed IP prefix boundaries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Allowed IP Prefixes</label>
            <Input
              className="font-mono text-xs"
              value={allowedSubnets}
              onChange={(e) => setAllowedSubnets(e.target.value)}
            />
            <p className="text-[10px] text-slate-500">Comma-separated campus subnet prefixes</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Simulate Client IP</label>
            <Input
              className="font-mono text-xs"
              value={testIp}
              onChange={(e) => setTestIp(e.target.value)}
            />
          </div>

          <div className="p-3 rounded-lg border bg-slate-900/60 flex items-center justify-between">
            <div className="text-xs">
              <p className="text-slate-300 font-medium">Boundary Match Result</p>
              <p className="text-slate-500 mt-0.5 text-[11px]">
                Client IP: <span className="font-mono text-slate-400">{testIp}</span>
              </p>
            </div>
            {isIpAllowed ? (
              <Badge variant="success" className="text-xs">
                Network Verified (OK)
              </Badge>
            ) : (
              <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                External / Untrusted IP
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mode B Biometric Rule Simulator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ScanFace className="w-4 h-4 text-emerald-400" /> Mode B Attendance Rule Engine
          </CardTitle>
          <CardDescription>
            Simulate Euclidean distance and liveness thresholds according to §5.4 specification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Facial Distance (d)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1.5"
                value={testFaceDist}
                onChange={(e) => setTestFaceDist(e.target.value)}
              />
              <p className="text-[10px] text-slate-500">Threshold: &lt; 0.45 ideal, &gt;= 0.6 reject</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Liveness / Blink Check</label>
              <Select
                value={testLiveness ? 'true' : 'false'}
                onValueChange={(val) => setTestLiveness(val === 'true')}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Passed (Blink Verified)</SelectItem>
                  <SelectItem value="false">Failed / Skipped</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500">EAR &lt; 0.22 blink transition</p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Calculated Attendance Status:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                  simulatedStatus === 'PRESENT'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : simulatedStatus === 'FLAGGED'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {simulatedStatus}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Composite Integrity Score:</span>
              <span className="font-mono font-bold text-slate-200">
                {(simulatedIntegrity * 100).toFixed(0)}% ({simulatedIntegrity.toFixed(2)})
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Hard Cutoff Threshold:</span>
              <span className="text-[11px] font-mono text-slate-400">
                {isDistanceAccepted ? 'ACCEPTED (d < 0.60)' : 'REJECTED (d >= 0.60)'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
