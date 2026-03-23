import { createClient } from 'jsr:@supabase/supabase-js@2';
import { generateObject, generateText, type LlmMessage } from '../_shared/llm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-user-jwt',
};

type DifficultyType = 'level1' | 'level2' | 'level3';

interface DraftTask {
  title: string;
  description: string;
  key_points: Array<{ point: string; weight: number }>;
  reference_answer: string;
  category: string;
  language: string;
  difficulty_type: DifficultyType;
}

interface LooseTask {
  title?: unknown;
  description?: unknown;
  key_points?: unknown;
  reference_answer?: unknown;
  category?: unknown;
  language?: unknown;
  difficulty_type?: unknown;
  prompt?: unknown;
}

function normalizeKeyPoints(input: unknown): Array<{ point: string; weight: number }> {
  if (Array.isArray(input)) {
    return input
      .filter((item) => item && typeof item === 'object' && 'point' in item)
      .slice(0, 5)
      .map((item) => {
        const point = String((item as { point?: unknown }).point || '').trim();
        const weightRaw = (item as { weight?: unknown }).weight;
        const weight = typeof weightRaw === 'number' && Number.isFinite(weightRaw) ? weightRaw : 0.2;
        return { point, weight };
      })
      .filter((item) => item.point.length > 0);
  }

  if (input && typeof input === 'object') {
    const entries = Object.entries(input as Record<string, unknown>).slice(0, 5);
    return entries.map(([k, v]) => ({
      point: k.replace(/_/g, ' ').trim(),
      weight: typeof v === 'number' && Number.isFinite(v) ? v : 0.2,
    }));
  }

  return [];
}

interface GenerateRequest {
  action: 'generate' | 'save';
  sourceUrl?: string;
  sourceText?: string;
  topic?: string;
  taskCount?: number;
  useVector?: boolean;
  debugRawModel?: boolean;
  tasks?: DraftTask[];
}
type RetrievalMode = 'vector-pg' | 'vector-qdrant' | 'sequential';

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function splitChunks(text: string, maxChars = 900): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter((item) => item.length > 40);

  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if (!current) {
      current = para;
      continue;
    }
    if ((current + '\n\n' + para).length <= maxChars) {
      current += `\n\n${para}`;
    } else {
      chunks.push(current);
      current = para;
    }
  }

  if (current) chunks.push(current);
  if (chunks.length > 0) return chunks;

  return text
    .split(/(?<=[。！？.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 60);
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildEmbedding(text: string, dim = 64): number[] {
  const vec = new Array<number>(dim).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((item) => item.length > 1)
    .slice(0, 500);

  for (const token of tokens) {
    const h = hashToken(token);
    const i = h % dim;
    const sign = (h & 1) === 0 ? 1 : -1;
    vec[i] += sign;
  }

  const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0)) || 1;
  return vec.map((x) => Number((x / norm).toFixed(6)));
}

function toVectorLiteral(vec: number[]) {
  return `[${vec.join(',')}]`;
}

function normalizeTaskCount(taskCount?: number) {
  if (!taskCount || Number.isNaN(taskCount)) return 8;
  return Math.max(3, Math.min(20, Math.floor(taskCount)));
}

function buildRetrievalQueries(topic: string) {
  return [
    `核心概念定义与直觉解释 ${topic}`,
    `实验设计与评价指标 ${topic}`,
    `方法局限、失败案例与改进方向 ${topic}`,
  ];
}

function toQdrantPointId(sourceId: string, chunkIndex: number): number {
  const raw = hashToken(`${sourceId}-${chunkIndex}`);
  return raw % 2147483647;
}

async function ensureQdrantCollection(qdrantUrl: string, collection: string, dim: number) {
  const endpoint = `${qdrantUrl.replace(/\/$/, '')}/collections/${collection}`;
  const getRes = await fetch(endpoint);
  if (getRes.ok) return;

  await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vectors: {
        size: dim,
        distance: 'Cosine',
      },
    }),
  });
}

async function upsertQdrantChunks(
  qdrantUrl: string,
  collection: string,
  sourceId: string,
  chunks: string[]
) {
  const points = chunks.map((content, index) => ({
    id: toQdrantPointId(sourceId, index),
    vector: buildEmbedding(content),
    payload: {
      source_id: sourceId,
      chunk_index: index,
      content,
    },
  }));

  await fetch(`${qdrantUrl.replace(/\/$/, '')}/collections/${collection}/points?wait=true`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points }),
  });
}

async function searchQdrant(
  qdrantUrl: string,
  collection: string,
  sourceId: string,
  query: string,
  limit: number
) {
  const response = await fetch(
    `${qdrantUrl.replace(/\/$/, '')}/collections/${collection}/points/search`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: buildEmbedding(query),
        limit,
        with_payload: true,
        filter: {
          must: [
            {
              key: 'source_id',
              match: { value: sourceId },
            },
          ],
        },
      }),
    }
  );

  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data?.result) ? data.result : [];
}

async function generateDraftTasksFromContext(
  topic: string,
  taskCount: number,
  contextChunks: string[],
  debugRawModel = false
): Promise<{ tasks: DraftTask[]; rawModelOutput?: string }> {
  const context = contextChunks
    .map((chunk, index) => `片段${index + 1}:\n${chunk}`)
    .join('\n\n');
  const promptMessages: LlmMessage[] = [
    {
      role: 'system',
      content: `你是一位“拆书出题专家”。你会根据输入书籍片段，设计用于口语训练的任务。
要求：
1. 只使用给定片段中的信息，不编造不存在内容
2. 任务总数严格为 ${taskCount}
3. difficulty_type 在 level1/level2/level3 之间分布尽量均衡
4. key_points 的权重和接近 1
5. 语言固定为中文
6. 你必须输出严格 JSON（JSON only），不要输出任何额外文本`,
    },
    {
      role: 'user',
      content: `主题：${topic}

请基于下列片段生成训练任务：
${context}

请仅返回 JSON。`,
    },
  ];

  const schema = {
    name: 'book_tasks',
    schema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          minItems: 3,
          maxItems: 20,
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              key_points: {
                type: 'array',
                minItems: 3,
                maxItems: 5,
                items: {
                  type: 'object',
                  properties: {
                    point: { type: 'string' },
                    weight: { type: 'number' },
                  },
                  required: ['point', 'weight'],
                  additionalProperties: false,
                },
              },
              reference_answer: { type: 'string' },
              category: { type: 'string' },
              language: { type: 'string' },
              difficulty_type: {
                type: 'string',
                enum: ['level1', 'level2', 'level3'],
              },
            },
            required: [
              'title',
              'description',
              'key_points',
              'reference_answer',
              'category',
              'language',
              'difficulty_type',
            ],
            additionalProperties: false,
          },
        },
      },
      required: ['tasks'],
      additionalProperties: false,
    },
  };

  const data = await generateObject<{ tasks?: DraftTask[] }>({
    messages: promptMessages,
    temperature: 0.4,
    maxTokens: 3200,
    schema,
  });

  const rawTasks = Array.isArray(data?.tasks) ? (data.tasks as LooseTask[]) : [];

  const normalizedTasks: DraftTask[] = rawTasks
    .map((task) => {
      const difficultyType: DifficultyType =
        task?.difficulty_type === 'level1' ||
        task?.difficulty_type === 'level2' ||
        task?.difficulty_type === 'level3'
          ? task.difficulty_type
          : 'level1';

      const keyPoints = normalizeKeyPoints(task?.key_points);
      const promptText = String(task?.prompt || '').trim();
      const titleText = String(task?.title || '').trim();
      const descriptionText = String(task?.description || '').trim();
      const descriptionFromPrompt = promptText
        ? `请围绕以下问题进行表达与论证：${promptText}`
        : '';

      return {
        title: titleText || promptText || '',
        description: descriptionText || descriptionFromPrompt || '',
        key_points: keyPoints,
        reference_answer:
          String(task?.reference_answer || '').trim() ||
          '建议回答结构：先定义核心概念，再解释因果或机制，随后给出证据/例子，最后总结限制与启发。',
        category: String(task?.category || '拆书任务').trim(),
        language: '中文',
        difficulty_type: difficultyType,
      };
    })
    .filter((task) => task.title && task.description && task.reference_answer && task.key_points.length >= 3);

  if (normalizedTasks.length === 0) {
    const fallback = contextChunks.slice(0, taskCount).map((chunk, index) => {
      const difficultyType: DifficultyType =
        index % 3 === 0 ? 'level1' : index % 3 === 1 ? 'level2' : 'level3';
      const keyPoints = chunk
        .split(/[。；;\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3)
        .map((point, i) => ({
          point: point.slice(0, 40),
          weight: i === 0 ? 0.4 : 0.3,
        }));
      return {
        title: `${topic} 拆书任务 ${index + 1}`,
        description: `请围绕该片段进行表达与复述：${chunk.slice(0, 180)}...`,
        key_points:
          keyPoints.length >= 3
            ? keyPoints
            : [
                { point: '解释片段的核心概念', weight: 0.4 },
                { point: '说明与主题的关系', weight: 0.3 },
                { point: '给出一个应用或例子', weight: 0.3 },
              ],
        reference_answer:
          '先定义概念，再解释机制与作用，接着给出实验或应用示例，最后总结局限与改进方向。',
        category: `拆书/${topic}`,
        language: '中文',
        difficulty_type: difficultyType,
      } satisfies DraftTask;
    });

    const rawModelOutput = debugRawModel
      ? await generateText({
          messages: promptMessages,
          temperature: 0.2,
          maxTokens: 1200,
        })
      : undefined;
    return { tasks: fallback, rawModelOutput };
  }

  const rawModelOutput = debugRawModel
    ? await generateText({
        messages: promptMessages,
        temperature: 0.2,
        maxTokens: 1200,
      })
    : undefined;

  return { tasks: normalizedTasks.slice(0, taskCount), rawModelOutput };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as GenerateRequest;
    const action = payload.action || 'generate';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (action === 'save') {
      const tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
      if (tasks.length === 0) {
        return new Response(JSON.stringify({ error: 'tasks 不能为空' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const insertPayload = tasks.map((task) => ({
        title: task.title,
        description: task.description,
        difficulty_level:
          task.difficulty_type === 'level1' ? 1 : task.difficulty_type === 'level2' ? 3 : 5,
        difficulty_type: task.difficulty_type,
        key_points: task.key_points,
        reference_answer: task.reference_answer,
        language: '中文',
        category: task.category || '拆书任务',
      }));

      const { data, error } = await supabase.from('practice_tasks').insert(insertPayload).select('*');
      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          inserted_count: data?.length || 0,
          tasks: data || [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const topic = (payload.topic || '深度表征学习').trim();
    const taskCount = normalizeTaskCount(payload.taskCount);
    const useVector = payload.useVector !== false;
    const debugRawModel = payload.debugRawModel === true;
    const sourceUrl = payload.sourceUrl?.trim();
    const qdrantUrl = Deno.env.get('QDRANT_URL')?.trim() || '';
    const qdrantCollection = Deno.env.get('QDRANT_COLLECTION')?.trim() || 'book_chunks';

    let sourceText = payload.sourceText?.trim() || '';
    if (!sourceText && sourceUrl) {
      const response = await fetch(sourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BookTaskBot/1.0)',
        },
      });
      if (!response.ok) {
        throw new Error(`抓取网页失败: ${response.status}`);
      }
      const html = await response.text();
      sourceText = stripHtmlToText(html);
    }

    if (!sourceText || sourceText.length < 200) {
      throw new Error('有效文本不足，请提供更完整的页面或文本内容');
    }

    const chunks = splitChunks(sourceText);
    let sourceId = crypto.randomUUID();
    try {
      const { data: sourceRow, error: sourceError } = await supabase
        .from('book_sources')
        .insert({
          source_url: sourceUrl || null,
          topic,
          raw_text: sourceText,
        })
        .select('id')
        .single();
      if (!sourceError && sourceRow?.id) {
        sourceId = sourceRow.id as string;
      }
    } catch {
      // Ignore persistence failures; generation can still proceed.
    }

    let selectedContext = chunks.slice(0, Math.min(10, chunks.length));
    let retrievalMode: RetrievalMode = 'sequential';

    if (useVector && qdrantUrl) {
      try {
        await ensureQdrantCollection(qdrantUrl, qdrantCollection, 64);
        await upsertQdrantChunks(qdrantUrl, qdrantCollection, sourceId, chunks);
        const queries = buildRetrievalQueries(topic);
        const selectedMap = new Map<string, { chunk_index: number; content: string }>();
        for (const query of queries) {
          const matches = await searchQdrant(
            qdrantUrl,
            qdrantCollection,
            sourceId,
            query,
            Math.max(6, Math.ceil(taskCount * 1.2))
          );
          for (const item of matches) {
            const payload = item?.payload || {};
            const idx = Number(payload.chunk_index);
            const content = String(payload.content || '');
            if (!Number.isNaN(idx) && content) {
              selectedMap.set(`${idx}`, { chunk_index: idx, content });
            }
          }
        }
        if (selectedMap.size > 0) {
          selectedContext = Array.from(selectedMap.values())
            .sort((a, b) => a.chunk_index - b.chunk_index)
            .slice(0, Math.max(10, taskCount + 4))
            .map((item) => item.content);
          retrievalMode = 'vector-qdrant';
        }
      } catch (error) {
        console.warn('Qdrant retrieval failed, fallback to sequential:', error);
      }
    } else if (useVector) {
      const queries = buildRetrievalQueries(topic);
      const selectedMap = new Map<string, { chunk_index: number; content: string; similarity: number }>();

      try {
        for (let i = 0; i < chunks.length; i++) {
          const vectorLiteral = toVectorLiteral(buildEmbedding(chunks[i]));
          const { error } = await supabase.rpc('upsert_book_chunk', {
            p_source_id: sourceId,
            p_chunk_index: i,
            p_content: chunks[i],
            p_embedding_literal: vectorLiteral,
          });
          if (error) throw error;
        }

        for (const query of queries) {
          const qVec = toVectorLiteral(buildEmbedding(query));
          const { data, error } = await supabase.rpc('match_book_chunks', {
            p_source_id: sourceId,
            p_query_embedding_literal: qVec,
            p_match_count: Math.max(6, Math.ceil(taskCount * 1.2)),
          });
          if (error) throw error;
          for (const item of data || []) {
            const key = `${item.chunk_index}`;
            if (!selectedMap.has(key)) {
              selectedMap.set(key, item);
            }
          }
        }
        if (selectedMap.size > 0) {
          selectedContext = Array.from(selectedMap.values())
            .sort((a, b) => a.chunk_index - b.chunk_index)
            .slice(0, Math.max(10, taskCount + 4))
            .map((item) => item.content);
          retrievalMode = 'vector-pg';
        }
      } catch (error) {
        console.warn('pgvector retrieval failed, fallback to sequential:', error);
      }
    }

    const generated = await generateDraftTasksFromContext(
      topic,
      taskCount,
      selectedContext,
      debugRawModel
    );
    const tasks = generated.tasks;

    return new Response(
      JSON.stringify({
        success: true,
        source_id: sourceId,
        source_url: sourceUrl || null,
        source_preview: sourceText.slice(0, 1200),
        chunk_count: chunks.length,
        retrieval_mode: retrievalMode,
        tasks,
        raw_model_output: debugRawModel ? generated.rawModelOutput || null : null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in book-task-generator:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
