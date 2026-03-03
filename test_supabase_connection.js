import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Key defined:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing users fetch...');
  const { data: users, error: uError } = await supabase.from('users').select('*');
  if (uError) console.error('Users error:', uError.message);
  else console.log('Users count:', users?.length);

  console.log('Testing teams fetch...');
  const { data: teams, error: tError } = await supabase.from('teams').select('*');
  if (tError) console.error('Teams error:', tError.message);
  else console.log('Teams count:', teams?.length);

  console.log('Testing non_existent_table...');
  const { error: nError } = await supabase.from('non_existent_table').select('*');
  if (nError) console.log('Expected error for non-existent table:', nError.message);
}

test();
