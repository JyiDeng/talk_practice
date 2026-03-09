import { useState, useEffect } from 'react';
import { Layout } from '@/components/layouts/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { getUserCareerProfile, createOrUpdateCareerProfile } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, Save } from 'lucide-react';
import { toast } from 'sonner';

const scenarioOptions = [
  '面试',
  '工作汇报',
  '项目演讲',
  '客户沟通',
  '团队协作',
  '会议发言',
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
      console.error('加载职业背景失败:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);

      await createOrUpdateCareerProfile(user.id, {
        industry: industry || null,
        position: position || null,
        work_years: workYears ? parseInt(workYears) : null,
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

  const toggleScenario = (scenario: string) => {
    setTargetScenarios((prev) =>
      prev.includes(scenario)
        ? prev.filter((s) => s !== scenario)
        : [...prev, scenario]
    );
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">个人设置</h1>
          <p className="text-muted-foreground mt-2">
            完善您的职业背景，获得更精准的训练内容
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              职业背景
            </CardTitle>
            <CardDescription>
              填写您的职业信息，系统将为您定制专属的练习场景
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="industry">所在行业</Label>
              <Input
                id="industry"
                placeholder="例如：互联网、金融、教育"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">职位</Label>
              <Input
                id="position"
                placeholder="例如：产品经理、软件工程师"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workYears">工作年限</Label>
              <Input
                id="workYears"
                type="number"
                placeholder="年"
                value={workYears}
                onChange={(e) => setWorkYears(e.target.value)}
                min="0"
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

            <div className="space-y-3">
              <Label>目标场景</Label>
              <p className="text-sm text-muted-foreground">
                选择您希望重点训练的职场场景
              </p>
              <div className="grid gap-3">
                {scenarioOptions.map((scenario) => (
                  <div key={scenario} className="flex items-center space-x-2">
                    <Checkbox
                      id={scenario}
                      checked={targetScenarios.includes(scenario)}
                      onCheckedChange={() => toggleScenario(scenario)}
                    />
                    <Label
                      htmlFor={scenario}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {scenario}
                    </Label>
                  </div>
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
