import { useState, useEffect } from 'react';
import { Layout } from '@/components/layouts/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUserCareerProfile, createOrUpdateCareerProfile } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [languagePreference, setLanguagePreference] = useState('中文');

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const profile = await getUserCareerProfile(user.id);
      if (profile) {
        setLanguagePreference(profile.language_preference || '中文');
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);

      await createOrUpdateCareerProfile(user.id, {
        language_preference: languagePreference,
        industry: null,
        position: null,
        work_years: null,
        target_scenarios: null,
      });

      toast.success('保存成功！');
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">个人设置</h1>
          <p className="text-muted-foreground mt-2">
            配置您的学习偏好
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              基本设置
            </CardTitle>
            <CardDescription>
              设置您的语言偏好和学习目标
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="language">语言偏好</Label>
              <Select value={languagePreference} onValueChange={setLanguagePreference}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="中文">中文</SelectItem>
                  <SelectItem value="英文">英文</SelectItem>
                  <SelectItem value="双语">双语</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} disabled={loading} className="w-full gap-2">
              <Save className="h-4 w-4" />
              {loading ? '保存中...' : '保存设置'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
