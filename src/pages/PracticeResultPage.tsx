import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layouts/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalysisReport } from '@/components/AnalysisReport';
import { getPracticeRecord } from '@/db/api';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import type { PracticeRecord } from '@/types';
import { toast } from 'sonner';

export default function PracticeResultPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<PracticeRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (recordId) {
      loadRecord();
    }
  }, [recordId]);

  const loadRecord = async () => {
    if (!recordId) return;

    try {
      setLoading(true);
      const data = await getPracticeRecord(recordId);
      setRecord(data);
    } catch (error) {
      console.error('加载记录失败:', error);
      toast.error('加载记录失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48 bg-muted" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-3/4 bg-muted" />
              <Skeleton className="h-4 w-1/2 bg-muted" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full bg-muted" />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!record || !record.analysis_results || record.analysis_results.length === 0) {
    return (
      <Layout>
        <Card>
          <CardHeader>
            <CardTitle>记录不存在或分析未完成</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/history')}>返回历史记录</Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const analysis = record.analysis_results[0];

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* 返回按钮 */}
        <Button variant="ghost" onClick={() => navigate('/history')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          返回历史记录
        </Button>

        {/* 练习信息 */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <CardTitle className="text-2xl">
                  {record.practice_tasks?.title || '练习记录'}
                </CardTitle>
                <CardDescription>
                  {record.practice_tasks?.description}
                </CardDescription>
              </div>
              <Badge variant="outline">{record.practice_tasks?.language}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(record.created_at).toLocaleString('zh-CN')}</span>
              </div>
              {record.duration && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{record.duration} 秒</span>
                </div>
              )}
            </div>

            {record.audio_url && (
              <div className="space-y-2">
                <p className="text-sm font-medium">您的录音</p>
                <audio src={record.audio_url} controls className="w-full" />
              </div>
            )}

            {record.transcription && (
              <div className="space-y-2">
                <p className="text-sm font-medium">识别文本</p>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm leading-relaxed">{record.transcription}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 分析报告 */}
        <AnalysisReport analysis={analysis} />

        {/* 参考答案 */}
        {record.practice_tasks?.reference_answer && (
          <Card>
            <CardHeader>
              <CardTitle>参考答案</CardTitle>
              <CardDescription>供您参考的标准表达方式</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">
                {record.practice_tasks.reference_answer}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
