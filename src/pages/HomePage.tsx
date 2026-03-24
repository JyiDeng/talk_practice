import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layouts/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PracticeTaskCard } from '@/components/PracticeTaskCard';
import { Skeleton } from '@/components/ui/skeleton';
import { getLatestTodayTask, getPracticeRecords } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, TrendingUp, Award, Calendar } from 'lucide-react';
import type { PracticeTask, PracticeRecord } from '@/types';
import { toast } from 'sonner';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [todayTask, setTodayTask] = useState<PracticeTask | null>(null);
  const [recentRecords, setRecentRecords] = useState<PracticeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPractices: 0,
    avgScore: 0,
    streak: 0,
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [taskResult, recordsResult] = await Promise.allSettled([
        getLatestTodayTask('中文'),
        getPracticeRecords(user.id, 5),
      ]);

      if (taskResult.status === 'fulfilled') {
        setTodayTask(taskResult.value);
      } else {
        console.error('加载今日任务失败:', taskResult.reason);
        setTodayTask(null);
      }

      const records = recordsResult.status === 'fulfilled' ? recordsResult.value : [];
      if (recordsResult.status === 'rejected') {
        console.error('加载练习记录失败:', recordsResult.reason);
      }
      setRecentRecords(records);

      // 计算统计数据
      const totalPractices = records.length;
      let totalScore = 0;
      let scoreCount = 0;

      for (const record of records) {
        if (record.analysis_results && record.analysis_results.length > 0) {
          const score = record.analysis_results[0].overall_score;
          if (score) {
            totalScore += score;
            scoreCount++;
          }
        }
      }

      setStats({
        totalPractices,
        avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
        streak: 0, // TODO: 计算连续练习天数
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPractice = () => {
    if (todayTask) {
      navigate(`/practice/${todayTask.id}`);
    } else {
      navigate('/practice');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 欢迎标题 */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">欢迎回来！</h1>
          <p className="text-muted-foreground mt-2">
            持续练习，提升您的学术表达和技术沟通能力
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总练习次数</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPractices}</div>
              <p className="text-xs text-muted-foreground">累计完成练习</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均得分</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgScore}</div>
              <p className="text-xs text-muted-foreground">综合表现评分</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">连续练习</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.streak}</div>
              <p className="text-xs text-muted-foreground">天</p>
            </CardContent>
          </Card>
        </div>

        {/* 今日任务 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              今日推荐任务
            </h2>
          </div>

          {loading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 bg-muted" />
                <Skeleton className="h-4 w-1/2 bg-muted" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full bg-muted" />
              </CardContent>
            </Card>
          ) : todayTask ? (
            <PracticeTaskCard task={todayTask} onStart={handleStartPractice} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>暂无推荐任务</CardTitle>
                <CardDescription>请前往练习页面选择任务</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/practice')}>
                  浏览所有任务
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 最近练习 */}
        {recentRecords.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">最近练习</h2>
              <Button variant="outline" onClick={() => navigate('/history')}>
                查看全部
              </Button>
            </div>

            <div className="grid gap-4">
              {recentRecords.map((record) => (
                <Card
                  key={record.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/history/${record.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {record.practice_tasks?.title}
                        </CardTitle>
                        <CardDescription>
                          {new Date(record.created_at).toLocaleString('zh-CN')}
                        </CardDescription>
                      </div>
                      {record.analysis_results && record.analysis_results.length > 0 && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {record.analysis_results[0].overall_score}
                          </div>
                          <p className="text-xs text-muted-foreground">总分</p>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
