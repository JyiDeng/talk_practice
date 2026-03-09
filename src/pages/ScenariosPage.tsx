import { useState, useEffect } from 'react';
import { Layout } from '@/components/layouts/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Play } from 'lucide-react';
import { getUserCareerProfile, callScenarioGeneration, createScenarioSimulation } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ScenarioContent } from '@/types';
import { toast } from 'sonner';

const scenarioTypes = [
  { value: '面试', label: '面试模拟' },
  { value: '工作汇报', label: '工作汇报' },
  { value: '项目演讲', label: '项目演讲' },
  { value: '客户沟通', label: '客户沟通' },
  { value: '团队协作', label: '团队协作' },
  { value: '会议发言', label: '会议发言' },
];

export default function ScenariosPage() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState('面试');
  const [language, setLanguage] = useState('中文');
  const [generating, setGenerating] = useState(false);
  const [scenario, setScenario] = useState<ScenarioContent | null>(null);
  const [industry, setIndustry] = useState('');
  const [position, setPosition] = useState('');

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
        setLanguage(profile.language_preference || '中文');
      }
    } catch (error) {
      console.error('加载职业背景失败:', error);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;

    try {
      setGenerating(true);

      const content = await callScenarioGeneration({
        scenarioType: selectedType,
        industry: industry || undefined,
        position: position || undefined,
        language,
      });

      setScenario(content);

      // 保存到数据库
      await createScenarioSimulation(user.id, selectedType, content);

      toast.success('场景生成成功！');
    } catch (error) {
      console.error('生成场景失败:', error);
      toast.error(error instanceof Error ? error.message : '生成场景失败');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">场景模拟</h1>
          <p className="text-muted-foreground mt-2">
            根据您的职业背景，生成定制化的职场场景进行练习
          </p>
        </div>

        {/* 场景选择 */}
        <Card>
          <CardHeader>
            <CardTitle>选择场景类型</CardTitle>
            <CardDescription>
              选择您想要练习的职场场景，系统将为您生成专属内容
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">场景类型</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarioTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">语言</label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="中文">中文</SelectItem>
                    <SelectItem value="英文">英文</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full gap-2"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  生成场景
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 生成的场景 */}
        {scenario && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{scenario.title}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{selectedType}</Badge>
                  <Badge variant="outline">{language}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 背景描述 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">场景背景</h3>
                  <p className="text-sm leading-relaxed">{scenario.background}</p>
                </div>

                {/* 角色设定 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">您的角色</h3>
                  <p className="text-sm leading-relaxed">{scenario.role}</p>
                </div>

                {/* 挑战点 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">挑战点</h3>
                  <ul className="space-y-2">
                    {scenario.challenges.map((challenge: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-destructive font-semibold">{index + 1}.</span>
                        <span>{challenge}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 评估标准 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">评估标准</h3>
                  <ul className="space-y-2">
                    {scenario.evaluation_criteria.map((criterion: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-semibold">✓</span>
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 参考要点 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">参考要点</h3>
                  <ul className="space-y-2">
                    {scenario.key_points.map((point: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-secondary font-semibold">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 开始练习按钮 */}
                <Button className="w-full gap-2" size="lg" onClick={() => toast.info('场景练习功能开发中')}>
                  <Play className="h-5 w-5" />
                  开始练习
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
