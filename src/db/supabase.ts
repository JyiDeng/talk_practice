import { createClient, type FunctionInvokeOptions } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is required');
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is required');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const publicFunctionsClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  },
});

export function invokePublicEdgeFunction<T>(
  functionName: string,
  options?: FunctionInvokeOptions
) {
  return publicFunctionsClient.functions.invoke<T>(functionName, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });
}

export const storageBuckets = {
  practiceAudio: import.meta.env.VITE_SUPABASE_PRACTICE_AUDIO_BUCKET || 'practice-audio',
  scenarioAudio: import.meta.env.VITE_SUPABASE_SCENARIO_AUDIO_BUCKET || 'scenario-audio',
  avatars: import.meta.env.VITE_SUPABASE_AVATARS_BUCKET || 'avatars',
};
