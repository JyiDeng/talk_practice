import { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layouts/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getLivePracticeSessions } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { LivePracticeIssueItem, LivePracticeSession, LivePracticeVocabularyItem } from '@/types';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type ReviewCategory = 'redundant' | 'grammar' | 'vocabulary' | 'logic';

interface ReviewEntry {
  id: string;
  category: ReviewCategory;
  issue: string;
  suggestion: string;
  sessionId: string;
  sessionTitle: string;
  createdAt: string;
}

const WELCOME_MESSAGE = '您好！我是您的职场表达能力导师。我可以帮助您练习各种职场沟通场景，并给予实时反馈。请用语音输入的方式直接开始对话吧！';

const formatSessionTitle = (session: LivePracticeSession) => {
  const msgs = Array.isArray(session.messages) ? session.messages : [];
  const firstUserMsg = msgs.find((msg) => msg.role === 'user');
  const fallback = msgs[0]?.content || '即时对练会话';
  const source = firstUserMsg?.content || fallback;
  return source.length > 24 ? `${source.slice(0, 24)}...` : source;
};

const toIssueEntries = (
  items: LivePracticeIssueItem[],
  category: ReviewCategory,
  session: LivePracticeSession
): ReviewEntry[] =>
  items
    .filter((item) => item.issue?.trim() && item.suggestion?.trim())
    .map((item, index) => ({
      id: `${session.id}-${category}-${item.issue}-${index}`,
      category,
      issue: item.issue.trim(),
      suggestion: item.suggestion.trim(),
      sessionId: session.id,
      sessionTitle: formatSessionTitle(session),
      createdAt: session.created_at,
    }));

const toVocabularyEntries = (
  items: LivePracticeVocabularyItem[],
  session: LivePracticeSession
): ReviewEntry[] =>
  items
    .filter((item) => item.term?.trim() && item.usage?.trim())
    .map((item, index) => ({
      id: `${session.id}-vocabulary-${item.term}-${index}`,
      category: 'vocabulary',
      issue: item.term.trim(),
      suggestion: item.usage.trim(),
      sessionId: session.id,
      sessionTitle: formatSessionTitle(session),
      createdAt: session.created_at,
    }));

const getCategoryLabel = (category: ReviewCategory) => {
  switch (category) {
    case 'redundant':
      return '冗余词';
    case 'grammar':
      return '语法';
    case 'vocabulary':
      return '词汇升级';
    case 'logic':
      return '逻辑';
    default:
      return '复盘项';
  }
};

export default function LivePracticeReviewPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<LivePracticeSession[]>([]);

  const loadSessions = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getLivePracticeSessions(user.id, 200);
      setSessions(data);
    } catch (error) {
      console.error('加载复盘条目失败:', error);
      toast.error('加载复盘条目失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, [user?.id]);

  const entries = useMemo(() => {
    const result: ReviewEntry[] = [];

    for (const session of sessions) {
      const messages = Array.isArray(session.messages) ? session.messages : [];
      const hasOnlyWelcome =
        messages.length === 1 &&
        messages[0]?.role === 'assistant' &&
        messages[0]?.content === WELCOME_MESSAGE;
      if (messages.length === 0 || hasOnlyWelcome) continue;

      const summary = session.analysis_summary;
      if (!summary) continue;

      result.push(...toIssueEntries(Array.isArray(summary.redundant_phrases) ? summary.redundant_phrases : [], 'redundant', session));
      result.push(...toIssueEntries(Array.isArray(summary.grammar_issues) ? summary.grammar_issues : [], 'grammar', session));
      result.push(...toVocabularyEntries(Array.isArray(summary.advanced_vocabulary) ? summary.advanced_vocabulary : [], session));
      result.push(...toIssueEntries(Array.isArray(summary.logic_issues) ? summary.logic_issues : [], 'logic', session));
    }

    const dedup = new Map<string, ReviewEntry>();
    for (const entry of result) {
      const key = `${entry.category}:${entry.issue.toLowerCase()}:${entry.suggestion.toLowerCase()}`;
      if (!dedup.has(key)) dedup.set(key, entry);
    }

    return Array.from(dedup.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [sessions]);

  const counts = useMemo(() => {
    return entries.reduce<Record<ReviewCategory, number>>(
      (acc, entry) => {
        acc[entry.category] += 1;
        return acc;
      },
      { redundant: 0, grammar: 0, vocabulary: 0, logic: 0 }
    );
  }, [entries]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">复盘条目总览</h1>
            <p className="mt-2 text-muted-foreground">
              聚合即时对练中的冗余词、语法、词汇升级和逻辑问题，方便集中复盘
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => void loadSessions()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>冗余词</CardDescription>
              <CardTitle className="text-2xl">{counts.redundant}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>语法</CardDescription>
              <CardTitle className="text-2xl">{counts.grammar}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>词汇升级</CardDescription>
              <CardTitle className="text-2xl">{counts.vocabulary}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>逻辑</CardDescription>
              <CardTitle className="text-2xl">{counts.logic}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((item) => (
              <Card key={item}>
                <CardHeader>
                  <Skeleton className="h-5 w-32 bg-muted" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>暂无可复盘条目</CardTitle>
              <CardDescription>
                可能是会话刚开始，或当前对话中暂未识别出明显问题
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-3">
            {entries.map((entry) => (
              <Card key={entry.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline">{getCategoryLabel(entry.category)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium">{entry.issue}</p>
                  <p className="text-sm text-muted-foreground">{entry.suggestion}</p>
                  <p className="text-xs text-muted-foreground">
                    来源会话：{entry.sessionTitle}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
