import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Clock, TrendingUp, Trash2 } from 'lucide-react';
import type { PracticeTask } from '@/types';

interface PracticeTaskCardProps {
  task: PracticeTask;
  onStart?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

export function PracticeTaskCard({ task, onStart, onDelete, deleting = false }: PracticeTaskCardProps) {
  const getDifficultyColor = (level: number) => {
    if (level <= 2) return 'bg-green-500';
    if (level <= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getDifficultyText = (level: number) => {
    if (level === 1) return '入门';
    if (level === 2) return '初级';
    if (level === 3) return '中级';
    if (level === 4) return '高级';
    return '专家';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-xl">{task.title}</CardTitle>
            <CardDescription>{task.description}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              {getDifficultyText(task.difficulty_level)}
            </Badge>
            <div className={`h-2 w-16 rounded-full ${getDifficultyColor(task.difficulty_level)}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>1-2分钟</span>
          </div>
          <Badge variant="secondary">{task.language}</Badge>
          {task.category && <Badge variant="outline">{task.category}</Badge>}
        </div>

        {task.key_points && task.key_points.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">关键要点：</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {task.key_points.slice(0, 3).map((kp: { point: string; weight: number }, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{kp.point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(onStart || onDelete) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {onStart && (
              <Button onClick={onStart} className="w-full gap-2">
                <Play className="h-4 w-4" />
                开始练习
              </Button>
            )}
            {onDelete && (
              <Button
                onClick={onDelete}
                className="w-full gap-2"
                variant="destructive"
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? '删除中...' : '删除卡片'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
