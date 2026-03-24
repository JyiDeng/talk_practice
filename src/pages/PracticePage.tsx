import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layouts/Layout';
import { PracticeTaskCard } from '@/components/PracticeTaskCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { callDailyTaskGenerator, deletePracticeTask } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { PracticeTask } from '@/types';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';

export default function PracticePage() {
  const navigate = useNavigate();
  const [level1Tasks, setLevel1Tasks] = useState<PracticeTask[]>([]);
  const [level2Tasks, setLevel2Tasks] = useState<PracticeTask[]>([]);
  const [level3Tasks, setLevel3Tasks] = useState<PracticeTask[]>([]);
  const [practicedTaskIds, setPracticedTaskIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingTaskIds, setDeletingTaskIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('level1');

  const sortTasksByPracticeStatus = (tasks: PracticeTask[], practicedIds: Set<string>) => {
    return [...tasks].sort((a, b) => {
      const aPracticed = practicedIds.has(a.id);
      const bPracticed = practicedIds.has(b.id);

      if (aPracticed !== bPracticed) {
        return aPracticed ? 1 : -1;
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      
      // 获取今天的任务（按difficulty_type分组）
      const { data, error } = await supabase
        .from('practice_tasks')
        .select('*')
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const taskIds = (data || []).map((task: PracticeTask) => task.id);
      const nextPracticedTaskIds = new Set<string>();

      if (taskIds.length > 0) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: records, error: recordsError } = await supabase
            .from('practice_records')
            .select('task_id')
            .eq('user_id', user.id)
            .in('task_id', taskIds);

          if (recordsError) throw recordsError;

          (records || []).forEach((record: { task_id: string | null }) => {
            if (record.task_id) {
              nextPracticedTaskIds.add(record.task_id);
            }
          });
        }
      }

      // 按难度分组
      const level1 = sortTasksByPracticeStatus(
        (data || []).filter((t: PracticeTask) => t.difficulty_type === 'level1'),
        nextPracticedTaskIds
      );
      const level2 = sortTasksByPracticeStatus(
        (data || []).filter((t: PracticeTask) => t.difficulty_type === 'level2'),
        nextPracticedTaskIds
      );
      const level3 = sortTasksByPracticeStatus(
        (data || []).filter((t: PracticeTask) => t.difficulty_type === 'level3'),
        nextPracticedTaskIds
      );

      setLevel1Tasks(level1);
      setLevel2Tasks(level2);
      setLevel3Tasks(level3);
      setPracticedTaskIds(nextPracticedTaskIds);

    } catch (error) {
      console.error('加载任务失败:', error);
      toast.error('加载任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTasks = async () => {
    try {
      setGenerating(true);

      const data = await callDailyTaskGenerator();
      toast.success(`成功生成 ${data.generated_count} 个新任务！`);
      await loadTasks();
    } catch (error) {
      console.error('生成任务失败:', error);
      toast.error(error instanceof Error ? error.message : '生成任务失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleStartTask = (taskId: string) => {
    navigate(`/practice/${taskId}`);
  };

  const removeTaskFromState = (taskId: string) => {
    setLevel1Tasks((prev) => prev.filter((task) => task.id !== taskId));
    setLevel2Tasks((prev) => prev.filter((task) => task.id !== taskId));
    setLevel3Tasks((prev) => prev.filter((task) => task.id !== taskId));
    setPracticedTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      setDeletingTaskIds((prev) => new Set(prev).add(taskId));
      await deletePracticeTask(taskId);
      removeTaskFromState(taskId);
      toast.success('卡片已删除');
    } catch (error) {
      console.error('删除任务失败:', error);
      toast.error('删除失败，请确认您有权限删除该任务');
    } finally {
      setDeletingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const renderTaskList = (tasks: PracticeTask[], emptyMessage: string) => {
    if (loading) {
      return (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full bg-muted" />
          ))}
        </div>
      );
    }

    if (tasks.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">{emptyMessage}</p>
          <Button onClick={handleGenerateTasks} disabled={generating} className="gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                生成今日任务
              </>
            )}
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2">
        {tasks.map((task) => (
          <PracticeTaskCard
            key={task.id}
            task={task}
            isPracticed={practicedTaskIds.has(task.id)}
            onStart={() => handleStartTask(task.id)}
            onDelete={() => handleDeleteTask(task.id)}
            deleting={deletingTaskIds.has(task.id)}
          />
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">学术口语训练</h1>
            <p className="text-muted-foreground mt-2">
              定制化的表达训练
            </p>
          </div>
          <Button onClick={handleGenerateTasks} disabled={generating} variant="outline" className="gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                生成新任务
              </>
            )}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="level1">
              Level 1 - 技术口语
              {level1Tasks.length > 0 && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {level1Tasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="level2">
              Level 2 - 研究讨论
              {level2Tasks.length > 0 && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {level2Tasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="level3">
              Level 3 - 技术质疑
              {level3Tasks.length > 0 && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {level3Tasks.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="level1" className="mt-6">
            <div className="mb-4 rounded-lg bg-muted p-4">
              <h3 className="font-semibold mb-2">渐进难度口语训练</h3>
              <p className="text-sm text-muted-foreground">
                适合每天练习，从简单解释到复杂技术讨论。包含技术解释、工程讨论、技术决策三种场景。
              </p>
            </div>
            {renderTaskList(level1Tasks, '暂无Level 1任务，点击生成今日任务')}
          </TabsContent>

          <TabsContent value="level2" className="mt-6">
            <div className="mb-4 rounded-lg bg-muted p-4">
              <h3 className="font-semibold mb-2">研究型口语训练</h3>
              <p className="text-sm text-muted-foreground">
                模拟博士组会和学术讨论，训练研究讨论能力和科研表达能力。
              </p>
            </div>
            {renderTaskList(level2Tasks, '暂无Level 2任务，点击生成今日任务')}
          </TabsContent>

          <TabsContent value="level3" className="mt-6">
            <div className="mb-4 rounded-lg bg-muted p-4">
              <h3 className="font-semibold mb-2">高压面试/技术质疑训练</h3>
              <p className="text-sm text-muted-foreground">
                最强训练模式，模拟技术面试、研究答辩、技术辩论等高压场景。
              </p>
            </div>
            {renderTaskList(level3Tasks, '暂无Level 3任务，点击生成今日任务')}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
