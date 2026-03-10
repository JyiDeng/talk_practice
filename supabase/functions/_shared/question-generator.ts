import { generateObject } from './llm.ts';

export type DifficultyType = 'level1' | 'level2' | 'level3';

export interface GeneratedPracticeTask {
  title: string;
  description: string;
  key_points: Array<{ point: string; weight: number }>;
  reference_answer: string;
  category: string;
  language: string;
  difficulty_type: DifficultyType;
}

function getDifficultyPrompt(difficultyType: DifficultyType, language: string) {
  if (difficultyType === 'level1') {
    return {
      systemPrompt: `你是一名技术表达训练题目设计师。请为 AI 表征学习、机器学习系统或软件工程研发方向的用户设计一个适合日常训练的新问题。

要求：
1. 难度固定为 level1，偏技术解释或基础工程讨论
2. 场景真实，适合 30 秒思考后进行 1-2 分钟口头回答
3. 输出语言为 ${language}
4. 关键点 3-5 个，每个权重 0 到 1，总和接近 1
5. reference_answer 写成高质量回答提纲，不要只是重复题目`,
      userPrompt: '请生成一个新的 level1 训练题。',
      category: '技术解释',
    };
  }

  if (difficultyType === 'level2') {
    return {
      systemPrompt: `你是一名科研讨论训练题目设计师。请为 AI 表征学习、机器学习系统或软件工程研发方向的用户设计一个研究型训练问题。

要求：
1. 难度固定为 level2，偏研究组会、实验复盘、论文 brainstorming
2. 场景真实，能迫使用户解释思路、实验设计或失败原因
3. 输出语言为 ${language}
4. 关键点 3-5 个，每个权重 0 到 1，总和接近 1
5. reference_answer 写成结构化回答提纲，体现研究思维`,
      userPrompt: '请生成一个新的 level2 训练题。',
      category: '研究讨论',
    };
  }

  return {
    systemPrompt: `你是一名高压技术质疑训练题目设计师。请为 AI 表征学习、机器学习系统或软件工程研发方向的用户设计一个高难度训练问题。

要求：
1. 难度固定为 level3，偏技术评审、系统设计辩护、论文答辩或面试追问
2. 问题需要有明显挑战性，要求用户给出取舍和论证
3. 输出语言为 ${language}
4. 关键点 3-5 个，每个权重 0 到 1，总和接近 1
5. reference_answer 写成高质量回答提纲，体现论证逻辑`,
    userPrompt: '请生成一个新的 level3 训练题。',
    category: '技术质疑',
  };
}

export async function generatePracticeTask(
  difficultyType: DifficultyType,
  language = '中文'
): Promise<GeneratedPracticeTask> {
  const prompt = getDifficultyPrompt(difficultyType, language);

  return generateObject<GeneratedPracticeTask>({
    messages: [
      { role: 'system', content: prompt.systemPrompt },
      { role: 'user', content: prompt.userPrompt },
    ],
    temperature: 0.9,
    maxTokens: 1600,
    schema: {
      name: 'generated_practice_task',
      schema: {
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
  });
}
