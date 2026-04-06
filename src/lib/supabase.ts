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
  const inMemoryData: Record<string, any[]> = {
    game_matches: [],
    game_players: [],
    game_tasks: [],
    game_player_tasks: [],
    game_events: [],
    game_votes: [],
  };

  const mockResult = (table: string, data: any = null, error: any = null) => {
    const promise = Promise.resolve({ data, error });
    return Object.assign(promise, {
      eq: (col: string, val: any) => {
        const filtered = (inMemoryData[table] || []).filter(item => item[col] === val);
        return mockResult(table, filtered, error);
      },
      select: () => mockResult(table, inMemoryData[table] || [], error),
      single: () => {
        const d = Array.isArray(data) ? data[0] : data;
        return Promise.resolve({ data: d, error });
      },
      maybeSingle: () => {
        const d = Array.isArray(data) ? data[0] : data;
        return Promise.resolve({ data: d, error: null });
      },
      order: () => mockResult(table, data, error),
      limit: () => mockResult(table, data, error),
      insert: (items: any[]) => {
        const newItems = items.map(item => ({ 
          id: Math.random().toString(36).substr(2, 9), 
          created_at: new Date().toISOString(),
          ...item 
        }));
        if (!inMemoryData[table]) inMemoryData[table] = [];
        inMemoryData[table].push(...newItems);
        return mockResult(table, newItems, error);
      },
      update: (updateData: any) => {
        if (Array.isArray(data)) {
          data.forEach(item => Object.assign(item, updateData));
        }
        return mockResult(table, data, error);
      },
      delete: () => {
        // Simple delete: clear the table for now
        inMemoryData[table] = [];
        return mockResult(table, [], error);
      },
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
    from: (table: string) => mockResult(table),
    rpc: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
    channel: () => ({
      on: function() { return this; },
      subscribe: () => ({})
    }),
    removeChannel: () => ({}),
  } as any;
}

export const supabase = supabaseClient;
