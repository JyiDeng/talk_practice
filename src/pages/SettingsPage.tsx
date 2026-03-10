import { useEffect, useState } from 'react';
import { Layout } from '@/components/layouts/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUserCareerProfile, createOrUpdateCareerProfile } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Briefcase, Save } from 'lucide-react';
import { toast } from 'sonner';

const targetScenarioOptions = [
  '技术解释',
  '工程讨论',
  '研究组会',
  '论文答辩',
  '技术面试',
  '跨团队沟通',
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [industry, setIndustry] = useState('');
  const [position, setPosition] = useState('');
  const [workYears, setWorkYears] = useState('');
  const [languagePreference, setLanguagePreference] = useState('中文');
  const [targetScenarios, setTargetScenarios] = useState<string[]>([]);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const profile = await getUserCareerProfile(user.id);
      if (profile) {
        setIndustry(profile.industry || '');
        setPosition(profile.position || '');
        setWorkYears(profile.work_years?.toString() || '');
        setLanguagePreference(profile.language_preference || '中文');
        setTargetScenarios(profile.target_scenarios || []);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  const handleScenarioToggle = (scenario: string, checked: boolean) => {
    setTargetScenarios((current) =>
      checked
        ? Array.from(new Set([...current, scenario]))
        : current.filter((item) => item !== scenario)
    );
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const parsedWorkYears = Number.parseInt(workYears, 10);

      await createOrUpdateCareerProfile(user.id, {
        industry: industry.trim() || null,
        position: position.trim() || null,
        work_years: Number.isNaN(parsedWorkYears) ? null : parsedWorkYears,
        language_preference: languagePreference,
        target_scenarios: targetScenarios.length > 0 ? targetScenarios : null,
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
            配置您的职业背景和训练偏好
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              用户信息
            </CardTitle>
            <CardDescription>
              这些信息会用于生成更贴近您背景的问题和场景
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="industry">研究方向 / 行业</Label>
                <Input
                  id="industry"
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value)}
                  placeholder="例如：AI表征学习、机器学习系统"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">职位 / 身份</Label>
                <Input
                  id="position"
                  value={position}
                  onChange={(event) => setPosition(event.target.value)}
                  placeholder="例如：算法工程师、博士生"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="workYears">工作 / 研究年限</Label>
                <Input
                  id="workYears"
                  type="number"
                  min="0"
                  value={workYears}
                  onChange={(event) => setWorkYears(event.target.value)}
                  placeholder="例如：3"
                />
              </div>

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
            </div>

            <div className="space-y-3">
              <Label>重点训练场景</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {targetScenarioOptions.map((scenario) => (
                  <label
                    key={scenario}
                    className="flex items-center gap-3 rounded-md border border-input px-3 py-3 text-sm"
                  >
                    <Checkbox
                      checked={targetScenarios.includes(scenario)}
                      onCheckedChange={(checked) =>
                        handleScenarioToggle(scenario, checked === true)
                      }
                    />
                    <span>{scenario}</span>
                  </label>
                ))}
              </div>
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
