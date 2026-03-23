import { generateObject, generateText } from '../_shared/llm.ts';

interface LivePracticeIssueItem {
  issue: string;
  suggestion: string;
  example?: string;
}

interface LivePracticeVocabularyItem {
  term: string;
  usage: string;
  note?: string;
}

interface LivePracticeSummary {
  redundant_phrases: LivePracticeIssueItem[];
  grammar_issues: LivePracticeIssueItem[];
  advanced_vocabulary: LivePracticeVocabularyItem[];
  logic_issues: LivePracticeIssueItem[];
  updated_at?: string;
}

const EMPTY_SUMMARY: LivePracticeSummary = {
  redundant_phrases: [],
  grammar_issues: [],
  advanced_vocabulary: [],
  logic_issues: [],
};

function fallbackTurnSummary(userText: string, assistantText: string): LivePracticeSummary {
  const text = `${userText}\n${assistantText}`.toLowerCase();
  const redundantPhrases: LivePracticeIssueItem[] = [];
  const grammarIssues: LivePracticeIssueItem[] = [];
  const vocab: LivePracticeVocabularyItem[] = [];
  const logicIssues: LivePracticeIssueItem[] = [];

  const fillerCandidates = ['然后', '就是', '那个', '其实', '我觉得', 'basically', 'actually'];
  for (const filler of fillerCandidates) {
    if (text.includes(filler.toLowerCase())) {
      redundantPhrases.push({
        issue: `高频口头禅：${filler}`,
        suggestion: '减少填充词，先停顿再组织下一句',
      });
      break;
    }
  }

  if (/[，,][\s]*所以/.test(userText) || /因为[\s\S]{0,12}所以/.test(userText)) {
    logicIssues.push({
      issue: '因果链条表达可能过于跳跃',
      suggestion: '把“前提-推理-结论”拆成三句，补上中间依据',
    });
  }

  if (userText.length > 0 && userText.length < 25) {
    grammarIssues.push({
      issue: '本轮表达较短，句式信息不足',
      suggestion: '至少补充背景、观点和一个例子，形成完整三句结构',
    });
  }

  if (text.includes('experiment') || text.includes('实验')) {
    vocab.push({
      term: 'ablation study',
      usage: '用于说明各模块对结果的独立贡献',
      note: '可替换“做了对比实验”',
    });
  }

  return {
    redundant_phrases: redundantPhrases,
    grammar_issues: grammarIssues,
    advanced_vocabulary: vocab,
    logic_issues: logicIssues,
    updated_at: new Date().toISOString(),
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionType, language = '中文', customPrompt, existingSummary } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: '缺少对话消息' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseSystemPrompt = `你是一位经验丰富的沟通训练导师。

你的职责：
1. 与用户进行即时对话练习
2. 针对用户的表达给予实时反馈
3. 指出逻辑、语气、措辞和结构上的问题
4. 提供简洁、具体、可执行的改进建议

请用${language}与用户交流，保持专业、直接、耐心的风格。当前会话类型：${sessionType || '即时对练'}。`;

    const normalizedCustomPrompt =
      typeof customPrompt === 'string' ? customPrompt.trim() : '';
    const systemPrompt = normalizedCustomPrompt
      ? `${baseSystemPrompt}\n\n以下是用户指定的训练要求，请严格遵循：\n${normalizedCustomPrompt}`
      : baseSystemPrompt;

    const assistantMessage = await generateText({
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.8,
      maxTokens: 900,
    });

    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message?.role === 'user' && typeof message?.content === 'string');

    const extractionPrompt = `你是“表达问题提取器”。请从“本轮新增对话”中提取问题并分类。

目标分类：
1) redundant_phrases：冗余词/口头禅/重复表达（如“那么”“然后”“就是”等）
2) grammar_issues：语法与句式问题（如状语位置、搭配、时态/语序）
3) advanced_vocabulary：可替换的更专业或更高级表达（避免过于生僻或非常具体的专有名词）
4) logic_issues：逻辑漏洞（因果断裂、前后矛盾、结论跳跃、证据不足）

提取规则：
- 只提取“本轮新增问题”，不要重复历史已记录问题。
- 若没有可提取内容，返回空数组。
- 每条建议需简洁、可执行，避免空话。
- 输出必须是 JSON，严格符合 schema。`;

    let turnSummary = EMPTY_SUMMARY;
    const latestUserText = latestUserMessage?.content ?? '';
    try {
      const summaryResult = await generateObject<LivePracticeSummary>({
        messages: [
          { role: 'system', content: extractionPrompt },
          {
            role: 'user',
            content: JSON.stringify({
              language,
              existingSummary: existingSummary ?? EMPTY_SUMMARY,
              latestUserMessage: latestUserMessage?.content ?? '',
              assistantReply: assistantMessage,
            }),
          },
        ],
        schema: {
          name: 'live_practice_turn_summary',
          schema: {
            type: 'object',
            additionalProperties: false,
            required: [
              'redundant_phrases',
              'grammar_issues',
              'advanced_vocabulary',
              'logic_issues',
            ],
            properties: {
              redundant_phrases: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['issue', 'suggestion'],
                  properties: {
                    issue: { type: 'string' },
                    suggestion: { type: 'string' },
                    example: { type: 'string' },
                  },
                },
              },
              grammar_issues: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['issue', 'suggestion'],
                  properties: {
                    issue: { type: 'string' },
                    suggestion: { type: 'string' },
                    example: { type: 'string' },
                  },
                },
              },
              advanced_vocabulary: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['term', 'usage'],
                  properties: {
                    term: { type: 'string' },
                    usage: { type: 'string' },
                    note: { type: 'string' },
                  },
                },
              },
              logic_issues: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['issue', 'suggestion'],
                  properties: {
                    issue: { type: 'string' },
                    suggestion: { type: 'string' },
                    example: { type: 'string' },
                  },
                },
              },
            },
          },
          strict: true,
        },
        temperature: 0.2,
        maxTokens: 900,
      });
      const normalizedSummary = {
        ...summaryResult,
        updated_at: new Date().toISOString(),
      };
      const hasAnyItem =
        normalizedSummary.redundant_phrases.length > 0 ||
        normalizedSummary.grammar_issues.length > 0 ||
        normalizedSummary.advanced_vocabulary.length > 0 ||
        normalizedSummary.logic_issues.length > 0;
      turnSummary = hasAnyItem
        ? normalizedSummary
        : fallbackTurnSummary(latestUserText, assistantMessage);
    } catch (summaryError) {
      console.error('提取复盘摘要失败:', summaryError);
      turnSummary = fallbackTurnSummary(latestUserText, assistantMessage);
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        turnSummary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('即时对练错误:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
