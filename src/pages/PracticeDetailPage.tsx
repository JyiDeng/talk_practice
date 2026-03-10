import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layouts/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AudioRecorder } from '@/components/AudioRecorder';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  getPracticeTask,
  createPracticeRecord,
  updatePracticeRecord,
  callSpeechRecognition,
  callAIAnalysis,
  createAnalysisResult,
} from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { ArrowLeft, FileText, Loader2, Clock, Brain } from 'lucide-react';
import type { PracticeTask } from '@/types';
import { toast } from 'sonner';

type StepType = 'intro' | 'thinking' | 'recording' | 'analyzing' | 'complete';

export default function PracticeDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState<PracticeTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<StepType>('intro');
  const [recordId, setRecordId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [thinkingTime, setThinkingTime] = useState(30);
  const [recordingTime, setRecordingTime] = useState(60);

  useEffect(() => {
    if (taskId) {
      loadTask();
    }
  }, [taskId]);

  // 思考倒计时
  useEffect(() => {
    if (step === 'thinking' && thinkingTime > 0) {
      const timer = setTimeout(() => {
        setThinkingTime(thinkingTime - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (step === 'thinking' && thinkingTime === 0) {
      // 思考时间结束，自动进入录音阶段
      setStep('recording');
    }
  }, [step, thinkingTime]);

  const loadTask = async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      const data = await getPracticeTask(taskId);
      setTask(data);
    } catch (error) {
      console.error('加载任务失败:', error);
      toast.error('加载任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStartThinking = () => {
    setStep('thinking');
    setThinkingTime(30);
  };

  const handleSkipThinking = () => {
    setStep('recording');
  };

  const handleRecordingComplete = async (audioBlob: Blob, duration: number) => {
    if (!user || !task) return;

    try {
      setStep('analyzing');
      setProgress(10);

      // 1. 上传音频文件到Supabase Storage
      const fileName = `${user.id}/${Date.now()}.wav`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app-a5e3v6eh2xoh_practice_audio')
        .upload(fileName, audioBlob, {
          contentType: 'audio/wav',
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('app-a5e3v6eh2xoh_practice_audio')
        .getPublicUrl(fileName);

      setProgress(20);

      // 2. 创建练习记录
      const record = await createPracticeRecord(user.id, task.id, urlData.publicUrl, duration);
      if (!record) throw new Error('创建练习记录失败');
      setRecordId(record.id);

      setProgress(30);

      // 3. 语音识别
      const audioBase64 = await blobToBase64(audioBlob);
      const recognitionResult = await callSpeechRecognition({
        audioBase64: audioBase64.split(',')[1],
        format: 'wav',
        rate: 16000,
      });

      setProgress(50);

      // 4. 更新转录文本
      await updatePracticeRecord(record.id, {
        transcription: recognitionResult.transcription,
        status: 'analyzing',
      });

      setProgress(60);

      // 5. AI分析
      const analysisResult = await callAIAnalysis({
        transcription: recognitionResult.transcription,
        referenceAnswer: task.reference_answer || '',
        keyPoints: task.key_points || [],
        language: task.language,
      });

      setProgress(80);

      // 6. 保存分析结果
      await createAnalysisResult(record.id, analysisResult);

      setProgress(90);

      // 7. 更新记录状态
      await updatePracticeRecord(record.id, {
        status: 'completed',
      });

      setProgress(100);
      setStep('complete');

      toast.success('分析完成！');

      // 跳转到结果页面
      setTimeout(() => {
        navigate(`/history/${record.id}`);
      }, 1500);
    } catch (error) {
      console.error('处理录音失败:', error);
      toast.error(error instanceof Error ? error.message : '处理录音失败');
      setStep('recording');
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
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

  if (!task) {
    return (
      <Layout>
        <Card>
          <CardHeader>
            <CardTitle>任务不存在</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/practice')}>返回练习列表</Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const getDifficultyLabel = (type: string) => {
    switch (type) {
      case 'level1':
        return 'Level 1 - 技术口语';
      case 'level2':
        return 'Level 2 - 研究讨论';
      case 'level3':
        return 'Level 3 - 技术质疑';
      default:
        return '未知难度';
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* 返回按钮 */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>

        {/* 任务信息 */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <CardTitle className="text-2xl">{task.title}</CardTitle>
                <CardDescription>{task.description}</CardDescription>
              </div>
              <Badge variant="outline">{getDifficultyLabel(task.difficulty_type || 'level1')}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {task.key_points && task.key_points.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  关键要点
                </div>
                <ul className="space-y-2">
                  {task.key_points.map((kp: { point: string; weight: number }, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-semibold">{index + 1}.</span>
                      <span>{kp.point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 开始练习 */}
        {step === 'intro' && (
          <Card>
            <CardHeader>
              <CardTitle>练习流程</CardTitle>
              <CardDescription>
                请先思考30秒，然后用1分钟时间回答问题
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="font-medium">第一步：思考时间（30秒）</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  仔细阅读场景描述和关键要点，组织你的回答思路
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium">第二步：录音回答（1分钟）</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  清晰地表达你的观点，尽量涵盖所有关键要点
                </p>
              </div>
              <Button onClick={handleStartThinking} size="lg" className="w-full">
                开始练习
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 思考阶段 */}
        {step === 'thinking' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary animate-pulse" />
                思考时间
              </CardTitle>
              <CardDescription>请仔细思考如何回答这个问题</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="text-6xl font-bold text-primary mb-4">
                  {thinkingTime}
                </div>
                <p className="text-sm text-muted-foreground">秒</p>
              </div>
              <Progress value={((30 - thinkingTime) / 30) * 100} className="h-2" />
              <Button onClick={handleSkipThinking} variant="outline" className="w-full">
                跳过思考，直接开始录音
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 录音阶段 */}
        {step === 'recording' && (
          <Card>
            <CardHeader>
              <CardTitle>正在录音</CardTitle>
              <CardDescription>
                请清晰地表达您的观点，建议回答时长1分钟左右
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AudioRecorder onRecordingComplete={handleRecordingComplete} maxDuration={180} />
            </CardContent>
          </Card>
        )}

        {/* 分析阶段 */}
        {step === 'analyzing' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                正在分析...
              </CardTitle>
              <CardDescription>AI正在分析您的表达，请稍候</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                {progress < 30 && '上传录音文件...'}
                {progress >= 30 && progress < 60 && '语音识别中...'}
                {progress >= 60 && progress < 90 && 'AI分析中...'}
                {progress >= 90 && '生成报告...'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 完成阶段 */}
        {step === 'complete' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">分析完成！</CardTitle>
              <CardDescription>正在跳转到结果页面...</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={100} className="h-2" />
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
