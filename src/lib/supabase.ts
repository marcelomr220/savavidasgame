import { createClient } from '@supabase/supabase-js';

// Use a valid-looking dummy URL if the real one is missing to avoid the URL constructor error
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL || 'https://placeholder-project.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || 'placeholder-key').trim();

let supabaseClient;

try {
  // Masked URL for logging
  const maskedUrl = supabaseUrl.replace(/(https?:\/\/).*(.supabase.co)/, '$1***$2');
  console.log(`Initializing Supabase with URL: ${maskedUrl}`);

  // Check if it's the placeholder or an invalid URL
  if (supabaseUrl.includes('placeholder-project') || !supabaseUrl.startsWith('http')) {
    console.warn("Supabase is not configured correctly. Using mock client.");
    throw new Error("Invalid Supabase URL");
  }
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  console.log("Supabase client initialized successfully.");
} catch (error) {
  // Minimal mock that handles common patterns without syntax errors
  const mockResult = (data: any = null, error: any = null) => {
    const promise = Promise.resolve({ data, error });
    return Object.assign(promise, {
      eq: () => mockResult(data, error),
      select: () => mockResult(data, error),
      single: () => mockResult(data, error),
      order: () => mockResult(data, error),
      limit: () => mockResult(data, error),
      insert: () => mockResult(data, error),
      update: () => mockResult(data, error),
      delete: () => mockResult(data, error),
      maybeSingle: () => mockResult(data, error),
    });
  };

  supabaseClient = {
    auth: {
      onAuthStateChanged: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
      signOut: async () => ({ error: null }),
    },
    from: () => mockResult([], { message: 'Supabase not configured' }),
    rpc: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
  } as any;
}

export const supabase = supabaseClient;
