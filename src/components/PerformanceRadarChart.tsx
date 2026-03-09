import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { RadarData } from '@/types';

interface PerformanceRadarChartProps {
  data: RadarData;
  title?: string;
  description?: string;
}

export function PerformanceRadarChart({
  data,
  title = '表达能力雷达图',
  description = '三个核心维度的综合评估',
}: PerformanceRadarChartProps) {
  const chartData = [
    {
      dimension: '逻辑严密性',
      score: data.logic,
    },
    {
      dimension: '词汇丰富度',
      score: data.vocabulary,
    },
    {
      dimension: '语速平稳度',
      score: data.speechRate,
    },
  ];

  const chartConfig = {
    score: {
      label: '得分',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
          <RadarChart data={chartData}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <PolarAngleAxis dataKey="dimension" />
            <PolarGrid />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar
              dataKey="score"
              fill="hsl(var(--primary))"
              fillOpacity={0.6}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
