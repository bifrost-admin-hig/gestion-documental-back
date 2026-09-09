const { DataSource } = require('typeorm');
require('dotenv').config();

const dataSource = new DataSource({
  type: (process.env.DB_TYPE || 'mysql'),
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_ROOT_USERNAME || process.env.DB_USERNAME || 'root',
  password: process.env.DB_ROOT_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'gestion_documental',
});

async function run() {
  await dataSource.initialize();
  
  // Disable FK checks to force drop
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  
  console.log('Dropping documents_history table...');
  await dataSource.query('DROP TABLE IF EXISTS documents_history');
  
  console.log('Dropping documents table...');
  await dataSource.query('DROP TABLE IF EXISTS documents');
  
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  
  console.log('Dropped tables.');
  
  await dataSource.destroy();
}

run().catch(err => console.error(err));
