import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [canReset, setCanReset] = useState(false);

  useEffect(() => {
    const checkRecoverySession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        toast.error('无法验证重置链接，请重新申请');
        setCanReset(false);
        setCheckingSession(false);
        return;
      }

      setCanReset(Boolean(data.session));
      setCheckingSession(false);
    };

    checkRecoverySession().catch(() => {
      toast.error('无法验证重置链接，请重新申请');
      setCanReset(false);
      setCheckingSession(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('密码长度至少为 6 位');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(password);
      if (error) throw error;

      toast.success('密码重置成功，请使用新密码登录');
      navigate('/login', { replace: true });
    } catch (error: unknown) {
      console.error('重置密码失败:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('重置失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">重设密码</CardTitle>
          <CardDescription className="text-center">
            通过邮件链接进入后，在这里设置新密码
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checkingSession ? (
            <p className="text-sm text-muted-foreground text-center">正在校验重置链接...</p>
          ) : !canReset ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                当前链接已失效或不完整，请重新发起“忘记密码”。
              </p>
              <Button asChild className="w-full">
                <Link to="/forgot-password">重新发送重置邮件</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">新密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入新密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认新密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="请再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '提交中...' : '更新密码'}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              返回登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
