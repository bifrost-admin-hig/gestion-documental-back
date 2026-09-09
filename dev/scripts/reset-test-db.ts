import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function resetDb() {
  if (process.env.NODE_ENV === 'production') {
    console.log('This script should only be run in test environment.');
    process.exit(0);
  }

  const dbName = process.env.DB_DATABASE || 'gd_migrations_test';

  console.log(`Connecting to MySQL to reset database: ${dbName}...`);

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_ROOT_USERNAME || 'root',
      password: process.env.DB_ROOT_PASSWORD || '',
    });

    console.log(`Dropping database if exists: ${dbName}`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);

    console.log(`Creating database: ${dbName}`);
    await connection.query(`CREATE DATABASE \`${dbName}\``);

    console.log('Database reset successfully.');
    await connection.end();
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

resetDb();
