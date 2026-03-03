import fetch from 'node-fetch';

async function testApi() {
  console.log('Testing /api/users...');
  const res = await fetch('http://localhost:3000/api/users');
  const data = await res.json();
  console.log('Users:', data);

  console.log('Testing /api/teams...');
  const res2 = await fetch('http://localhost:3000/api/teams');
  const data2 = await res2.json();
  console.log('Teams:', data2);
}

testApi();
