import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, KeyRound } from 'lucide-react';
import { adminFetcher } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function AccessVerificationPage() {
  const [adminId, setAdminId] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminIdError, setAdminIdError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setTempToken } = useAuth();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminIdError(null);

    if (!adminId.trim()) {
      setAdminIdError('Super Admin ID is required.');
      return;
    }
    if (adminId.trim().length !== 24 || !/^[0-9a-fA-F]{24}$/.test(adminId.trim())) {
      setAdminIdError('Super Admin ID must be a 24-character hexadecimal string.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await adminFetcher<{ success: boolean; message: string; tempToken: string }>(
        '/verify-access',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminId, accessKey }),
        }
      );

      if (response.success) {
        toast.success(response.message);
        setTempToken(response.tempToken); // Store the temporary token
        navigate('/login'); // Redirect to login page
      } else {
        toast.error(response.message || 'Verification failed.');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during verification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <KeyRound className="mx-auto h-10 w-10 text-primary mb-4" />
          <CardTitle className="text-2xl font-display">Admin Access</CardTitle>
          <CardDescription>Enter your Super Admin ID and Super Admin Key to proceed.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="adminId">Super Admin ID</Label>
              <Input
                id="adminId"
                type="text"
                placeholder="Enter Super Admin ID (from console)"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                required
                className={adminIdError ? 'border-destructive' : ''}
              />
              {adminIdError && <p className="text-destructive text-sm mt-1">{adminIdError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessKey">Super Admin Key</Label>
              <Input
                id="accessKey"
                type="password"
                placeholder="Enter Super Admin Key"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Access'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}