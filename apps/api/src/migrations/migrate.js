require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function migrate() {
  const files = fs.readdirSync(__dirname)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  try {
    console.log('🔄 Running migrations...');
    for (const file of files) {
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf-8');
      console.log(`  → ${file}`);
      await pool.query(sql);
    }
    console.log('✅ All migrations applied successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
