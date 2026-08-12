const { Client } = require('pg');

async function checkDb() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgrespassword',
    database: 'local',
  });
  
  try {
    await client.connect();
    
    // Check all users
    const usersRes = await client.query('SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;');
    console.log("--- RECENT USERS ---");
    usersRes.rows.forEach(u => console.log(u));
    
    // Check org members
    const orgRes = await client.query('SELECT * FROM public.org_members;');
    console.log("\n--- ORG MEMBERS ---");
    orgRes.rows.forEach(o => console.log(o));
    
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkDb();
