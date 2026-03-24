import { useMemo, useState } from 'react';
import { Layout } from '@/components/layouts/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { callBookTaskGenerator, saveBookGeneratedTasks } from '@/db/api';
import { toast } from 'sonner';
import { BookMarked, Sparkles, Save, Globe, FileText, CheckSquare, ListPlus } from 'lucide-react';
import type { KeyPoint } from '@/types';

type DifficultyType = 'level1' | 'level2' | 'level3';

interface GeneratedTaskDraft {
  id: string;
  title: string;
  description: string;
  key_points: KeyPoint[];
  reference_answer: string;
  category: string;
  difficulty_level: number;
  difficulty_type: DifficultyType;
}

const DEFAULT_SOURCE_URL =
  '';

const NUMBERED_ITEM_REGEX = /(\d{1,3})[\.\)、)]\s*([\s\S]*?)(?=(?:\d{1,3}[\.\)、)]\s*)|$)/g;

const mapDifficultyLevel = (difficultyType: DifficultyType) => {
  if (difficultyType === 'level1') return 1;
  if (difficultyType === 'level2') return 3;
  return 5;
};

export default function BookDecomposePage() {
  const [workbenchMode, setWorkbenchMode] = useState<'semantic' | 'list-import'>('semantic');
  const [sourceType, setSourceType] = useState<'url' | 'text'>('url');
  const [sourceUrl, setSourceUrl] = useState(DEFAULT_SOURCE_URL);
  const [sourceText, setSourceText] = useState('');
  const [topic, setTopic] = useState('深度表征学习');
  const [taskCount, setTaskCount] = useState(8);
  const [listInput, setListInput] = useState('');
  const [importCategory, setImportCategory] = useState('自定义题库');
  const [importDifficultyType, setImportDifficultyType] = useState<DifficultyType>('level1');
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTaskDraft[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [useVector, setUseVector] = useState(true);
  const [debugRawModel, setDebugRawModel] = useState(true);
  const [sourcePreview, setSourcePreview] = useState('');
  const [rawModelOutput, setRawModelOutput] = useState('');
  const [retrievalMode, setRetrievalMode] = useState<
    'vector-pg' | 'vector-qdrant' | 'sequential' | null
  >(null);

  const selectedCount = selectedIds.size;
  const hasTextInput = sourceText.trim().length >= 80;
  const hasUrlInput = sourceUrl.trim().length > 8;
  const canGenerate = hasTextInput || hasUrlInput;

  const allSelected = useMemo(
    () => generatedTasks.length > 0 && selectedIds.size === generatedTasks.length,
    [generatedTasks.length, selectedIds.size]
  );

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error('请先粘贴要拆解的文本内容');
      return;
    }

    try {
      setGenerating(true);
      const result = await callBookTaskGenerator({
        action: 'generate',
        sourceUrl: sourceType === 'url' ? sourceUrl.trim() : undefined,
        // 只要文本框有内容就上传，避免在“网页来源”标签下误丢文本。
        sourceText: sourceText.trim() ? sourceText.trim() : undefined,
        topic: topic.trim() || '深度表征学习',
        taskCount,
        useVector,
        debugRawModel,
      });

      const drafts: GeneratedTaskDraft[] = result.tasks.map((task, index) => ({
        id: `${Date.now()}-${index}`,
        title: task.title,
        description: task.description,
        key_points: task.key_points as KeyPoint[],
        reference_answer: task.reference_answer,
        category: task.category,
        difficulty_type: task.difficulty_type,
        difficulty_level:
          task.difficulty_type === 'level1' ? 1 : task.difficulty_type === 'level2' ? 3 : 5,
      }));

      setSourcePreview(result.source_preview);
      setRawModelOutput(result.raw_model_output || '');
      setRetrievalMode(result.retrieval_mode);
      setGeneratedTasks(drafts);
      setSelectedIds(new Set(drafts.map((task) => task.id)));
      toast.success(`已生成 ${drafts.length} 条语义拆书任务（${result.retrieval_mode}）`);
    } catch (error) {
      console.error('拆书失败:', error);
      toast.error(error instanceof Error ? error.message : '拆书失败，请调整文本后重试');
    } finally {
      setGenerating(false);
    }
  };

  const toggleSelect = (taskId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(generatedTasks.map((task) => task.id)));
      return;
    }
    setSelectedIds(new Set());
  };

  const handleImportByList = () => {
    const raw = listInput.trim();
    if (!raw) {
      toast.error('请先输入编号列表内容');
      return;
    }

    const matches = Array.from(raw.matchAll(NUMBERED_ITEM_REGEX));
    const drafts: GeneratedTaskDraft[] = matches
      .map((match, index) => {
        const itemTitle = match[2].replace(/\s+/g, ' ').trim();
        if (!itemTitle) {
          return null;
        }

        return {
          id: `${Date.now()}-manual-${index}`,
          title: itemTitle,
          description: `手动导入题目（序号 ${match[1]}）`,
          key_points: [{ point: itemTitle, weight: 1 } as KeyPoint],
          reference_answer: `请围绕题目“${itemTitle}”进行回答，建议包含：定义与背景、个人观点、具体案例、可执行建议。`,
          category: importCategory.trim() || '自定义题库',
          difficulty_type: importDifficultyType,
          difficulty_level: mapDifficultyLevel(importDifficultyType),
        };
      })
      .filter((task): task is GeneratedTaskDraft => task !== null);

    if (drafts.length === 0) {
      toast.error('未识别到有效编号格式，请按“1. 内容 2. 内容”输入');
      return;
    }

    setSourcePreview('');
    setRawModelOutput('');
    setRetrievalMode(null);
    setGeneratedTasks(drafts);
    setSelectedIds(new Set(drafts.map((task) => task.id)));
    toast.success(`已从列表导入 ${drafts.length} 条题目`);
  };

  const saveToPracticeTasks = async () => {
    if (selectedIds.size === 0) {
      toast.error('请至少选择 1 条任务');
      return;
    }

    try {
      setSaving(true);
      const payload = generatedTasks
        .filter((task) => selectedIds.has(task.id))
        .map((task) => ({
          title: task.title,
          description: task.description,
          difficulty_level: task.difficulty_level,
          difficulty_type: task.difficulty_type,
          key_points: task.key_points,
          reference_answer: task.reference_answer,
          language: '中文',
          category: task.category,
        }));

      const result = await saveBookGeneratedTasks({
        action: 'save',
        tasks: payload,
      });

      toast.success(`已加入 ${result.inserted_count} 条任务到“每日练习”`);
    } catch (error) {
      console.error('保存任务失败:', error);
      toast.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold gradient-text">拆书任务工坊</h1>
          <p className="text-muted-foreground mt-2">
            把书籍内容拆成可练习、可考察的口语任务，并直接加入当前练习池。
          </p>
        </div>

        <Tabs value={workbenchMode} onValueChange={(value) => setWorkbenchMode(value as 'semantic' | 'list-import')}>
          <TabsList className="grid w-full grid-cols-2 max-w-xl">
            <TabsTrigger value="semantic" className="gap-2">
              <Sparkles className="h-4 w-4" />
              语义拆解生成
            </TabsTrigger>
            <TabsTrigger value="list-import" className="gap-2">
              <ListPlus className="h-4 w-4" />
              列表一键导入
            </TabsTrigger>
          </TabsList>

          <TabsContent value="semantic" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookMarked className="h-5 w-5 text-primary" />
                  内容输入
                </CardTitle>
                <CardDescription>
                  支持网页自动抓取正文，并通过向量检索 + API 语义拆解生成任务。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={sourceType} onValueChange={(value) => setSourceType(value as 'url' | 'text')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url" className="gap-2">
                      <Globe className="h-4 w-4" />
                      网页来源
                    </TabsTrigger>
                    <TabsTrigger value="text" className="gap-2">
                      <FileText className="h-4 w-4" />
                      纯文本来源
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="url" className="space-y-3 mt-4">
                    <Label htmlFor="source-url">网页地址</Label>
                    <Input
                      id="source-url"
                      value={sourceUrl}
                      onChange={(event) => setSourceUrl(event.target.value)}
                      placeholder="输入需要拆解的网页链接"
                    />
                    <p className="text-xs text-muted-foreground">
                      生成时会由后端自动抓取页面正文。建议输入章节页而不是目录页。
                    </p>
                  </TabsContent>
                  <TabsContent value="text" className="space-y-3 mt-4">
                    <p className="text-sm text-muted-foreground">
                      直接粘贴章节文字、读书笔记或摘要都可以。
                    </p>
                  </TabsContent>
                </Tabs>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="topic">任务分类主题</Label>
                    <Input
                      id="topic"
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      placeholder="例如：对比学习、信息瓶颈、生成模型"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-count">任务数量（1-20）</Label>
                    <Input
                      id="task-count"
                      type="number"
                      min={1}
                      max={20}
                      value={taskCount}
                      onChange={(event) => {
                        const parsed = Number(event.target.value);
                        if (Number.isNaN(parsed)) return;
                        setTaskCount(Math.max(1, Math.min(20, parsed)));
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="use-vector"
                    checked={useVector}
                    onCheckedChange={(checked) => setUseVector(Boolean(checked))}
                  />
                  <Label htmlFor="use-vector">使用向量检索增强拆书（推荐）</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="debug-raw-model"
                    checked={debugRawModel}
                    onCheckedChange={(checked) => setDebugRawModel(Boolean(checked))}
                  />
                  <Label htmlFor="debug-raw-model">显示模型原始输出（调试）</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source-text">拆解文本（可选）</Label>
                  <Textarea
                    id="source-text"
                    value={sourceText}
                    onChange={(event) => setSourceText(event.target.value)}
                    rows={12}
                    placeholder="可直接粘贴正文；若填写了网页地址，也可留空让系统自动抓取..."
                  />
                </div>

                <Button onClick={() => void handleGenerate()} disabled={generating || !canGenerate} className="gap-2">
                  {generating ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      拆解中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      生成拆书任务
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list-import" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListPlus className="h-5 w-5 text-primary" />
                  列表导入
                </CardTitle>
                <CardDescription>
                  直接粘贴编号题目，支持“1. 题目A 2. 题目B”或按行输入，系统会按正则切分并生成可保存的任务草稿。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="import-category">分类</Label>
                    <Input
                      id="import-category"
                      value={importCategory}
                      onChange={(event) => setImportCategory(event.target.value)}
                      placeholder="例如：我的自选题"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="import-difficulty">默认难度</Label>
                    <Tabs
                      value={importDifficultyType}
                      onValueChange={(value) => setImportDifficultyType(value as DifficultyType)}
                    >
                      <TabsList id="import-difficulty" className="grid w-full grid-cols-3">
                        <TabsTrigger value="level1">Level 1</TabsTrigger>
                        <TabsTrigger value="level2">Level 2</TabsTrigger>
                        <TabsTrigger value="level3">Level 3</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="list-input">编号题目列表</Label>
                  <Textarea
                    id="list-input"
                    value={listInput}
                    onChange={(event) => setListInput(event.target.value)}
                    rows={10}
                    placeholder={'示例：\n1. 坚持对一个人的重要性\n2. 如何做一个情绪稳定的人\n3. 你最近一次深度学习复盘的收获'}
                  />
                  <p className="text-xs text-muted-foreground">
                    支持符号："1."、"1)"、"1、"。导入后可直接在下方预览并保存到练习池。
                  </p>
                </div>

                <Button onClick={handleImportByList} className="gap-2">
                  <ListPlus className="h-4 w-4" />
                  一键切分并导入
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              任务预览
            </CardTitle>
            <CardDescription>
              已生成 {generatedTasks.length} 条，已选择 {selectedCount} 条。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sourcePreview && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  抓取摘要（模式：{retrievalMode || 'n/a'}）
                </p>
                <p className="text-sm whitespace-pre-wrap">{sourcePreview}</p>
              </div>
            )}
            {rawModelOutput && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">模型原始输出（Raw）</p>
                <p className="text-xs whitespace-pre-wrap">{rawModelOutput}</p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                />
                <Label htmlFor="select-all">全选</Label>
              </div>
              <Button
                onClick={() => void saveToPracticeTasks()}
                disabled={saving || selectedCount === 0}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? '保存中...' : '加入我的练习内容'}
              </Button>
            </div>

            {generatedTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                还没有任务草稿，先输入文本并点击“生成拆书任务”。
              </div>
            ) : (
              <ScrollArea className="h-[480px] pr-4">
                <div className="space-y-3">
                  {generatedTasks.map((task) => {
                    const checked = selectedIds.has(task.id);
                    return (
                      <Card key={task.id} className={checked ? 'border-primary/60' : ''}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => toggleSelect(task.id, Boolean(value))}
                              />
                              <CardTitle className="text-base">{task.title}</CardTitle>
                            </div>
                            <Badge variant="outline">{task.difficulty_type}</Badge>
                          </div>
                          <CardDescription>{task.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm font-medium mb-2">关键要点</p>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {task.key_points.map((point, index) => (
                              <li key={`${task.id}-point-${index}`}>
                                {index + 1}. {point.point}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
