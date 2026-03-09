import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layouts/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getPracticeRecords } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, TrendingUp } from 'lucide-react';
import type { PracticeRecord } from '@/types';
import { toast } from 'sonner';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, [user]);

  const loadRecords = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getPracticeRecords(user.id, 50);
      setRecords(data);
    } catch (error) {
      console.error('加载历史记录失败:', error);
      toast.error('加载历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">已完成</Badge>;
      case 'analyzing':
        return <Badge variant="secondary">分析中</Badge>;
      case 'failed':
        return <Badge variant="destructive">失败</Badge>;
      default:
        return <Badge variant="outline">待处理</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">练习历史</h1>
          <p className="text-muted-foreground mt-2">查看您的所有练习记录和分析结果</p>
        </div>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 bg-muted" />
                  <Skeleton className="h-4 w-1/2 bg-muted" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : records.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>暂无练习记录</CardTitle>
              <CardDescription>开始您的第一次练习吧！</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4">
            {records.map((record) => (
              <Card
                key={record.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  if (record.status === 'completed') {
                    navigate(`/history/${record.id}`);
                  }
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">
                        {record.practice_tasks?.title || '练习记录'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(record.created_at).toLocaleString('zh-CN')}
                        </span>
                        <Badge variant="outline">
                          {record.practice_tasks?.language}
                        </Badge>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(record.status)}
                      {record.analysis_results &&
                        record.analysis_results.length > 0 &&
                        record.analysis_results[0].overall_score && (
                          <div className="flex items-center gap-1 text-primary">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-2xl font-bold">
                              {record.analysis_results[0].overall_score}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
