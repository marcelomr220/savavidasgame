import { createClient } from '@supabase/supabase-js';

async function verifyKeys(url, key) {
  console.log(`Testing URL: ${url}`);
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from('users').select('count');
  if (error) {
    console.error(`❌ Error: ${error.message}`);
  } else {
    console.log(`✅ Success! Found ${data.length} users.`);
  }
}

const url = process.argv[2];
const key = process.argv[3];

if (!url || !key) {
  console.log('Usage: npx tsx verify_keys.js <URL> <KEY>');
} else {
  verifyKeys(url, key);
}
