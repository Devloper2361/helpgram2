const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://helpgram_dev:dev_password@localhost:5432/helpgram?schema=public'
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL successfully!");
    
    // Check tables
    const tableRes = await client.query(`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';`);
    const tables = tableRes.rows.map(r => r.tablename);
    console.log("Tables in Postgres:", tables);
    
    if (tables.includes('User')) {
      const usersRes = await client.query('SELECT count(*) FROM "User"');
      console.log("User count in Postgres:", usersRes.rows[0].count);
      
      const worker15 = await client.query(`SELECT email, role, status FROM "User" WHERE email = 'worker15@helpgram.local'`);
      console.log("Worker15 exists in Postgres:", worker15.rows.length > 0);
      if (worker15.rows.length > 0) {
        console.log("Worker15 details:", worker15.rows[0]);
      }
    } else {
      console.log("User table DOES NOT exist in Postgres.");
    }
    
    console.log("JobLock table exists:", tables.includes('JobLock'));
  } catch (err) {
    console.error("Postgres connection error:", err.message);
  } finally {
    await client.end();
  }
}
run();
