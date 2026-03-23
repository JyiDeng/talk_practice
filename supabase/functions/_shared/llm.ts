export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface JsonSchemaConfig {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
}

interface GenerateTextOptions {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
}

interface GenerateObjectOptions<T> extends GenerateTextOptions {
  schema: JsonSchemaConfig;
}

type Provider = 'qwen' | 'openai-compatible' | 'legacy-gateway';

function resolveProvider(): Provider {
  const preferred = Deno.env.get('LLM_PROVIDER')?.toLowerCase();
  const hasQwen = Boolean(Deno.env.get('QWEN_API_KEY'));
  const hasOpenAiCompatible =
    Boolean(Deno.env.get('OPENAI_COMPATIBLE_API_KEY')) &&
    Boolean(Deno.env.get('OPENAI_COMPATIBLE_BASE_URL'));
  const hasLegacyGateway = Boolean(Deno.env.get('INTEGRATIONS_API_KEY'));

  if (preferred === 'qwen') {
    if (!hasQwen) {
      throw new Error('LLM_PROVIDER is qwen but QWEN_API_KEY is not configured');
    }
    return 'qwen';
  }

  if (preferred === 'openai-compatible') {
    if (!hasOpenAiCompatible) {
      throw new Error(
        'LLM_PROVIDER is openai-compatible but OPENAI_COMPATIBLE_API_KEY or OPENAI_COMPATIBLE_BASE_URL is not configured'
      );
    }
    return 'openai-compatible';
  }

  if (hasQwen) {
    return 'qwen';
  }

  if (hasOpenAiCompatible) {
    return 'openai-compatible';
  }

  if (hasLegacyGateway) {
    return 'legacy-gateway';
  }

  throw new Error(
    'No LLM provider configured. Set QWEN_API_KEY, OPENAI_COMPATIBLE_* variables, or INTEGRATIONS_API_KEY.'
  );
}

async function callQwen(
  messages: LlmMessage[],
  temperature: number,
  maxTokens: number,
  responseFormat?: { type: 'json_object' | 'json_schema'; json_schema?: JsonSchemaConfig }
) {
  const apiKey = Deno.env.get('QWEN_API_KEY');
  if (!apiKey) {
    throw new Error('QWEN_API_KEY is not configured');
  }

  const baseUrl =
    Deno.env.get('QWEN_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const model = Deno.env.get('QWEN_MODEL') || 'qwen-plus';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: responseFormat,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Qwen API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Qwen returned empty content');
  }

  return content;
}

async function callOpenAiCompatible(
  messages: LlmMessage[],
  temperature: number,
  maxTokens: number,
  responseFormat?: { type: 'json_object' | 'json_schema'; json_schema?: JsonSchemaConfig }
) {
  const apiKey = Deno.env.get('OPENAI_COMPATIBLE_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_COMPATIBLE_API_KEY is not configured');
  }

  const baseUrl = Deno.env.get('OPENAI_COMPATIBLE_BASE_URL');
  if (!baseUrl) {
    throw new Error('OPENAI_COMPATIBLE_BASE_URL is not configured');
  }
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_COMPATIBLE_MODEL') || 'gpt-4.1-mini',
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: responseFormat,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI-compatible API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenAI-compatible provider returned empty content');
  }

  return content;
}

async function callLegacyGateway(
  messages: LlmMessage[],
  temperature: number,
  maxTokens: number,
  responseFormat?: { type: 'json_object' | 'json_schema'; json_schema?: JsonSchemaConfig }
) {
  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
  if (!apiKey) {
    throw new Error('INTEGRATIONS_API_KEY is not configured');
  }

  const baseUrl =
    Deno.env.get('INTEGRATIONS_BASE_URL') ||
    'https://app-a5e3v6eh2xoh-api-Aa2PqMJnJGwL-gateway.appmiaoda.com/v1';

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/text/chatcompletion_v2`, {
    method: 'POST',
    headers: {
      'X-Gateway-Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('INTEGRATIONS_MODEL') || 'MiniMax-M2.5',
      messages,
      temperature,
      max_completion_tokens: maxTokens,
      response_format: responseFormat,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Legacy gateway API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Legacy gateway returned empty content');
  }

  return content;
}

async function invokeModel(
  messages: LlmMessage[],
  temperature = 0.7,
  maxTokens = 1200,
  responseFormat?: { type: 'json_object' | 'json_schema'; json_schema?: JsonSchemaConfig }
) {
  const normalizedMessages =
    responseFormat
      ? [
          ...messages,
          {
            role: 'system' as const,
            content: 'Return valid JSON only.',
          },
        ]
      : messages;

  const provider = resolveProvider();
  if (provider === 'qwen') {
    return callQwen(normalizedMessages, temperature, maxTokens, responseFormat);
  }
  if (provider === 'openai-compatible') {
    return callOpenAiCompatible(normalizedMessages, temperature, maxTokens, responseFormat);
  }
  return callLegacyGateway(normalizedMessages, temperature, maxTokens, responseFormat);
}

export async function generateText({
  messages,
  temperature = 0.7,
  maxTokens = 1200,
}: GenerateTextOptions): Promise<string> {
  return invokeModel(messages, temperature, maxTokens);
}

export async function generateObject<T>({
  messages,
  schema,
  temperature = 0.7,
  maxTokens = 1200,
}: GenerateObjectOptions<T>): Promise<T> {
  try {
    const content = await invokeModel(messages, temperature, maxTokens, {
      type: 'json_schema',
      json_schema: {
        name: schema.name,
        schema: schema.schema,
        strict: schema.strict ?? true,
      },
    });

    return JSON.parse(content) as T;
  } catch (error) {
    // Some OpenAI-compatible providers (including certain model routes)
    // may not reliably honor json_schema. Fallback to plain text + JSON extraction.
    console.warn('generateObject json_schema failed, fallback to text parsing:', error);
    const fallbackMessages: LlmMessage[] = [
      ...messages,
      {
        role: 'system',
        content:
          'Return valid JSON only. Do not use markdown fences. The whole response must be one JSON object.',
      },
    ];
    const raw = await invokeModel(fallbackMessages, temperature, maxTokens);
    const trimmed = raw.trim();
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      const maybeJson = trimmed.slice(first, last + 1);
      return JSON.parse(maybeJson) as T;
    }
    throw new Error('Model did not return parseable JSON');
  }
}
