import fetch from 'node-fetch';

async function checkStatus() {
  const res = await fetch('http://localhost:3000/api/supabase/status');
  const data = await res.json();
  console.log('Supabase Status:', data);
}

checkStatus();
