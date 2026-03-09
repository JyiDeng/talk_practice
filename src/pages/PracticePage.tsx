import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layouts/Layout';
import { PracticeTaskCard } from '@/components/PracticeTaskCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPracticeTasks } from '@/db/api';
import type { PracticeTask } from '@/types';
import { toast } from 'sonner';

export default function PracticePage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<PracticeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<string>('all');

  useEffect(() => {
    loadTasks();
  }, [language]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await getPracticeTasks(language === 'all' ? undefined : language, 50);
      setTasks(data);
    } catch (error) {
      console.error('加载任务失败:', error);
      toast.error('加载任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = (taskId: string) => {
    navigate(`/practice/${taskId}`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">每日练习</h1>
            <p className="text-muted-foreground mt-2">选择一个任务开始练习</p>
          </div>
          <div className="w-48">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部语言</SelectItem>
                <SelectItem value="中文">中文</SelectItem>
                <SelectItem value="英文">英文</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-48 w-full bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {tasks.map((task) => (
              <PracticeTaskCard
                key={task.id}
                task={task}
                onStart={() => handleStartTask(task.id)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
