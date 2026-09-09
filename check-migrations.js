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
  const migrations = await dataSource.query('SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 10');
  console.log('Last migrations:', migrations);

  // If CreateDocumentsTable1762448341830 is there, delete it
  const found = migrations.find(m => m.name.includes('1762448341830'));
  if (found) {
    console.log('Removing failed migration record...');
    await dataSource.query('DELETE FROM migrations WHERE id = ?', [found.id]);
    console.log('Removed.');
  }

  await dataSource.destroy();
}

run().catch(err => console.error(err));
