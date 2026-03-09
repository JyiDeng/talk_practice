import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, Lightbulb, TrendingUp } from 'lucide-react';
import type { AnalysisResult } from '@/types';

interface AnalysisReportProps {
  analysis: AnalysisResult;
}

export function AnalysisReport({ analysis }: AnalysisReportProps) {
  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLevel = (score: number | null) => {
    if (!score) return '未评分';
    if (score >= 85) return '优秀';
    if (score >= 70) return '良好';
    if (score >= 60) return '及格';
    return '需提升';
  };

  const scores = [
    { label: '词汇运用', value: analysis.vocabulary_score, icon: '📚' },
    { label: '内容完整性', value: analysis.completeness_score, icon: '✅' },
    { label: '逻辑组织', value: analysis.logic_score, icon: '🧠' },
    { label: '表达方法', value: analysis.expression_score, icon: '💬' },
  ];

  return (
    <div className="space-y-6">
      {/* 总体得分 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            总体评分
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-5xl font-bold ${getScoreColor(analysis.overall_score)}`}>
                {analysis.overall_score || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {getScoreLevel(analysis.overall_score)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">语速</p>
              <p className="text-2xl font-semibold">
                {analysis.speech_rate?.toFixed(0) || 0}
              </p>
              <p className="text-xs text-muted-foreground">字/分钟</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 各维度得分 */}
      <Card>
        <CardHeader>
          <CardTitle>各维度评分</CardTitle>
          <CardDescription>四个核心维度的详细评估</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scores.map((score, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <span>{score.icon}</span>
                  {score.label}
                </span>
                <span className={`text-sm font-semibold ${getScoreColor(score.value)}`}>
                  {score.value || 0} 分
                </span>
              </div>
              <Progress value={score.value || 0} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 遗漏的关键点 */}
      {analysis.missing_points && analysis.missing_points.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              遗漏的关键点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.missing_points.map((point: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-destructive mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 改进建议 */}
      {analysis.suggestions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              改进建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{analysis.suggestions}</p>
          </CardContent>
        </Card>
      )}

      {/* 更好的表达方式 */}
      {analysis.better_expressions && analysis.better_expressions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              更好的表达方式
            </CardTitle>
            <CardDescription>参考以下表达可以让你的沟通更有说服力</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.better_expressions.map((expr: { original: string; improved: string }, index: number) => (
              <div key={index} className="space-y-2">
                <div>
                  <Badge variant="outline" className="mb-2">原表达</Badge>
                  <p className="text-sm text-muted-foreground">{expr.original}</p>
                </div>
                <Separator />
                <div>
                  <Badge variant="default" className="mb-2">改进后</Badge>
                  <p className="text-sm font-medium">{expr.improved}</p>
                </div>
                {index < (analysis.better_expressions?.length || 0) - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
