import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/auth-context';
import api from '@/api/axios';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);

      // Route based on role
      const role = res.data.user.role;
      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'TEACHER') navigate('/teacher');
      else navigate('/student');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickCredentials = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative">
      <Card className="w-full max-w-md border-border bg-card shadow-lg relative z-10">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <GraduationCap className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-100">Fornax Academic Hub</CardTitle>
          <CardDescription>Sign in to your academic portal account</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  type="email"
                  placeholder="name@fornax.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="default" className="w-full mt-2" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono block mb-2 text-center">
              Quick Test Credentials
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-slate-800 text-xs py-1 transition-colors"
                onClick={() => fillQuickCredentials('student@fornax.edu')}
              >
                Student Demo
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-slate-800 text-xs py-1 transition-colors"
                onClick={() => fillQuickCredentials('teacher@fornax.edu')}
              >
                Teacher Demo
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-slate-800 text-xs py-1 transition-colors"
                onClick={() => fillQuickCredentials('admin@fornax.edu')}
              >
                Admin Demo
              </Badge>
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-center border-t border-border pt-4">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:underline font-medium">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
