import { useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/layouts/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  callLivePractice,
  createLivePracticeSession,
  getLivePracticeSessions,
  updateLivePracticeSession,
} from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  MessageSquarePlus,
  Send,
  User,
} from 'lucide-react';
import type { ChatMessage, LivePracticeSession } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const WELCOME_MESSAGE = '您好！我是您的职场表达能力导师。我可以帮助您练习各种职场沟通场景，并给予实时反馈。请告诉我您想练习什么场景，或者直接开始对话吧！';
const DEFAULT_SESSION_TYPE = '即时对练';
const DEFAULT_PROMPT_TEMPLATE = `请在本次对练中按以下要求进行：
1. 练习主题：
2. 目标场景：
3. 我希望你扮演的对象：
4. 语气与风格要求：
5. 我希望你重点纠正的问题（例如逻辑、表达、专业术语、礼貌度）：
6. 其他补充要求：`;

const createWelcomeMessage = (): ChatMessage => ({
  role: 'assistant',
  content: WELCOME_MESSAGE,
  timestamp: new Date().toISOString(),
});

const normalizeMessages = (messages: LivePracticeSession['messages']) =>
  Array.isArray(messages) ? messages : [];

const formatTime = (value?: string | null, withDate = false) => {
  if (!value) return '';

  return new Date(value).toLocaleString(
    'zh-CN',
    withDate
      ? {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      : {
          hour: '2-digit',
          minute: '2-digit',
        }
  );
};

const getSessionTitle = (session: LivePracticeSession) => {
  const messages = normalizeMessages(session.messages);
  const firstUserMessage = messages.find((message) => message.role === 'user');
  const fallbackMessage = messages[0];
  const source = firstUserMessage?.content || fallbackMessage?.content || '新的即时对练';

  return source.length > 24 ? `${source.slice(0, 24)}...` : source;
};

const getSessionSummary = (session: LivePracticeSession) => {
  const messages = normalizeMessages(session.messages);
  const hasWelcomeMessage =
    messages[0]?.role === 'assistant' && messages[0]?.content === WELCOME_MESSAGE;
  const messageCount = hasWelcomeMessage ? Math.max(messages.length - 1, 0) : messages.length;

  if (messageCount === 0) {
    return '尚未开始对话';
  }

  return `${messageCount} 条消息`;
};

export default function LivePracticePage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<LivePracticeSession[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentPromptTemplate, setCurrentPromptTemplate] = useState(DEFAULT_PROMPT_TEMPLATE);
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  const [promptDraft, setPromptDraft] = useState(DEFAULT_PROMPT_TEMPLATE);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void initializePage();
  }, [user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const syncSession = (session: LivePracticeSession) => {
    setSessions((currentSessions) => {
      const existingIndex = currentSessions.findIndex((item) => item.id === session.id);

      if (existingIndex === -1) {
        return [session, ...currentSessions];
      }

      const nextSessions = [...currentSessions];
      nextSessions[existingIndex] = session;
      return nextSessions;
    });
  };

  const selectSession = (session: LivePracticeSession) => {
    setSessionId(session.id);
    setMessages(normalizeMessages(session.messages));
    setCurrentPromptTemplate(session.prompt_template?.trim() || DEFAULT_PROMPT_TEMPLATE);
    setInput('');
  };

  const createSession = async ({
    sessionType = DEFAULT_SESSION_TYPE,
    promptTemplate = DEFAULT_PROMPT_TEMPLATE,
  }: {
    sessionType?: string;
    promptTemplate?: string;
  } = {}) => {
    if (!user) return null;

    const welcomeMessage = createWelcomeMessage();
    const normalizedPrompt = promptTemplate.trim() || DEFAULT_PROMPT_TEMPLATE;
    const session = await createLivePracticeSession(
      user.id,
      sessionType,
      [welcomeMessage],
      normalizedPrompt
    );

    if (!session) {
      return null;
    }

    syncSession(session);
    selectSession(session);
    return session;
  };

  const initializePage = async () => {
    if (!user) {
      setSessions([]);
      setMessages([]);
      setSessionId(null);
      return;
    }

    try {
      setHistoryLoading(true);
      const data = await getLivePracticeSessions(user.id, 50);
      setSessions(data);

      if (data.length > 0) {
        selectSession(data[0]);
        return;
      }

      setSessionId(null);
      setMessages([]);
      setCurrentPromptTemplate(DEFAULT_PROMPT_TEMPLATE);
      setPromptDraft(DEFAULT_PROMPT_TEMPLATE);
      setPromptEditorOpen(true);
    } catch (error) {
      console.error('加载即时对练失败:', error);
      toast.error('加载即时对练失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (messageListRef.current) {
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !sessionId) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const pendingSession = await updateLivePracticeSession(sessionId, {
        messages: newMessages,
      });

      if (pendingSession) {
        syncSession(pendingSession);
      }

      // 调用AI对练
      const selectedSession = sessions.find((session) => session.id === sessionId);
      const response = await callLivePractice({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        sessionType: selectedSession?.session_type || DEFAULT_SESSION_TYPE,
        language: '中文',
        customPrompt: currentPromptTemplate,
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      const updatedSession = await updateLivePracticeSession(sessionId, {
        messages: updatedMessages,
      });

      if (updatedSession) {
        syncSession(updatedSession);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      toast.error(error instanceof Error ? error.message : '发送消息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleCreateSession = () => {
    if (loading) return;

    setPromptDraft(DEFAULT_PROMPT_TEMPLATE);
    setPromptEditorOpen(true);
  };

  const handleConfirmCreateSession = async () => {
    if (loading) return;

    const nextPrompt = promptDraft.trim();
    if (!nextPrompt) {
      toast.error('Prompt 不能为空');
      return;
    }

    try {
      setHistoryLoading(true);
      await createSession({
        sessionType: DEFAULT_SESSION_TYPE,
        promptTemplate: nextPrompt,
      });
      setPromptEditorOpen(false);
      toast.success('已创建新对话');
    } catch (error) {
      console.error('创建即时对练会话失败:', error);
      toast.error('创建即时对练会话失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  const renderHistoryList = () => (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        {historyLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载历史会话...
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            暂无历史会话
          </div>
        ) : (
          sessions.map((session) => (
            <button
              type="button"
              key={session.id}
              className={cn(
                'w-full rounded-lg border p-3 text-left transition-colors',
                session.id === sessionId
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted'
              )}
              onClick={() => selectSession(session)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {getSessionTitle(session)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getSessionSummary(session)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatTime(session.created_at, true)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </ScrollArea>
  );

  const isCustomPrompt = currentPromptTemplate.trim() !== DEFAULT_PROMPT_TEMPLATE.trim();

  return (
    <Layout>
      <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-7xl gap-4">
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-6 w-6 text-primary" />
                  即时对练
                </CardTitle>
                <CardDescription>
                  与虚拟职场导师进行实时对话，获得即时反馈
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-2"
                onClick={() => setHistoryOpen((open) => !open)}
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">历史对话</span>
                {historyOpen ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            {historyOpen && (
              <div className="border-b p-4 lg:hidden">
                <div className="max-h-64 overflow-hidden rounded-lg border bg-muted/20">
                  <div className="flex items-center justify-between gap-2 border-b p-3">
                    <div>
                      <p className="text-sm font-medium">历史对话</p>
                      <p className="text-xs text-muted-foreground">切换并继续之前的会话</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setHistoryOpen(false)}
                      className="shrink-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="border-b p-3">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => void handleCreateSession()}
                      disabled={historyLoading || loading}
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                      新建对话
                    </Button>
                  </div>
                  <div className="h-40">{renderHistoryList()}</div>
                </div>
              </div>
            )}
            <div
              ref={messageListRef}
              className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4"
            >
              {messages.map((message, index) => (
                <div
                  key={`${message.timestamp || 'message'}-${index}`}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg px-4 py-2',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </p>
                    {message.timestamp && (
                      <p className="mt-1 text-xs opacity-70">
                        {formatTime(message.timestamp)}
                      </p>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg bg-muted px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t p-4">
              <p className="mb-2 text-xs text-muted-foreground">
                当前 Prompt: {isCustomPrompt ? '已自定义' : '默认模板'}。点击“新建对话”可编辑。
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="输入您的消息..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading || !sessionId}
                />
                <Button
                  onClick={() => void handleSend()}
                  disabled={loading || !input.trim() || !sessionId}
                  size="icon"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'hidden min-h-0 overflow-hidden transition-all duration-200 lg:flex lg:flex-col',
            historyOpen ? 'w-80' : 'w-16'
          )}
        >
          <CardHeader className="border-b p-3">
            <div className="flex items-center justify-between gap-2">
              {historyOpen && (
                <div>
                  <CardTitle className="text-base">历史对话</CardTitle>
                  <CardDescription>切换并继续之前的会话</CardDescription>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setHistoryOpen((open) => !open)}
                className="shrink-0"
              >
                {historyOpen ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
            {historyOpen && (
              <Button
                variant="outline"
                className="mt-3 w-full gap-2"
                onClick={() => void handleCreateSession()}
                disabled={historyLoading || loading}
              >
                <MessageSquarePlus className="h-4 w-4" />
                新建对话
              </Button>
            )}
          </CardHeader>
          {historyOpen && <CardContent className="min-h-0 flex-1 p-0">{renderHistoryList()}</CardContent>}
          {!historyOpen && (
            <div className="flex flex-1 items-start justify-center pt-4">
              <History className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </Card>
      </div>

      <Dialog open={promptEditorOpen} onOpenChange={setPromptEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建对话前编辑 Prompt</DialogTitle>
            <DialogDescription>
              系统已填入默认 Prompt。你可以补充主题、内容范围、语气和目标要求。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="prompt-template" className="text-sm font-medium">
              对练 Prompt
            </label>
            <Textarea
              id="prompt-template"
              value={promptDraft}
              onChange={(event) => setPromptDraft(event.target.value)}
              rows={12}
              placeholder="请输入你希望 AI 严格遵循的对练要求"
              disabled={historyLoading}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPromptDraft(DEFAULT_PROMPT_TEMPLATE)}
              disabled={historyLoading}
            >
              重置默认
            </Button>
            <Button
              variant="outline"
              onClick={() => setPromptEditorOpen(false)}
              disabled={historyLoading}
            >
              取消
            </Button>
            <Button onClick={() => void handleConfirmCreateSession()} disabled={historyLoading}>
              {historyLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                '创建并开始'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
