import { useEffect, useState } from 'react';
import { Layout } from '@/components/layouts/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PerformanceRadarChart } from '@/components/PerformanceRadarChart';
import { getWeeklyReports, callWeeklyReport } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, TrendingUp, Award, Loader2 } from 'lucide-react';
import type { WeeklyReport } from '@/types';
import { toast } from 'sonner';

export default function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadReports();
  }, [user]);

  const loadReports = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getWeeklyReports(user.id, 10);
      setReports(data);
    } catch (error) {
      console.error('加载周报失败:', error);
      toast.error('加载周报失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!user) return;

    try {
      setGenerating(true);

      // 计算上周的起止日期
      const now = new Date();
      const dayOfWeek = now.getDay();
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - dayOfWeek - 6);
      lastMonday.setHours(0, 0, 0, 0);

      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      lastSunday.setHours(23, 59, 59, 999);

      const report = await callWeeklyReport({
        weekStart: lastMonday.toISOString().split('T')[0],
        weekEnd: lastSunday.toISOString().split('T')[0],
      });

      toast.success('周报生成成功！');
      await loadReports();
    } catch (error) {
      console.error('生成周报失败:', error);
      toast.error(error instanceof Error ? error.message : '生成周报失败');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">周报分析</h1>
            <p className="text-muted-foreground mt-2">查看您的每周表达能力提升轨迹</p>
          </div>
          <Button onClick={handleGenerateReport} disabled={generating} className="gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Award className="h-4 w-4" />
                生成上周周报
              </>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-6">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48 bg-muted" />
                  <Skeleton className="h-4 w-32 bg-muted" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>暂无周报</CardTitle>
              <CardDescription>
                完成至少一次练习后，可以生成周报
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGenerateReport} disabled={generating}>
                生成周报
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        {new Date(report.week_start).toLocaleDateString('zh-CN')} -{' '}
                        {new Date(report.week_end).toLocaleDateString('zh-CN')}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        本周完成 {report.practice_count} 次练习
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 雷达图 */}
                  {report.radar_data && (
                    <PerformanceRadarChart
                      data={report.radar_data}
                      title="本周表现"
                      description="三个核心维度的综合评估"
                    />
                  )}

                  {/* 各维度得分 */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          逻辑严密性
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="text-2xl font-bold">
                            {report.logic_score?.toFixed(1) || 0}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          词汇丰富度
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="text-2xl font-bold">
                            {report.vocabulary_score?.toFixed(1) || 0}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          语速平稳度
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="text-2xl font-bold">
                            {report.speech_rate_score?.toFixed(1) || 0}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 改进总结 */}
                  {report.improvement_summary && (
                    <div className="rounded-lg bg-muted p-4">
                      <p className="text-sm font-medium mb-2">本周总结</p>
                      <p className="text-sm leading-relaxed">
                        {report.improvement_summary}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
