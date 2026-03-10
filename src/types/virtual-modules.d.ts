// src/types/virtual-modules.d.ts

declare module '@/db/supabase' {
  export const supabase: ReturnType<typeof import('@supabase/supabase-js').createClient>;
  export const storageBuckets: {
    practiceAudio: string;
    scenarioAudio: string;
    avatars: string;
  };
}

declare module '@/types/types' {
  export interface Profile {
    [key: string]: unknown;
  }
}
