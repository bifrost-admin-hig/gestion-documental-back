require('reflect-metadata');
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
  },
});

// Registrar tsconfig-paths para resolver los alias de path
require('tsconfig-paths/register');

const { DataSource } = require('typeorm');

process.loadEnvFile('.env');

module.exports = new DataSource({
  type: (process.env.DB_TYPE || 'mysql'),
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_ROOT_USERNAME || process.env.DB_USERNAME || 'root',
  password: process.env.DB_ROOT_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'gestion_documental',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  charset: 'utf8mb4',
  timezone: 'Z',
  entities: [
    'src/shared/infrastructure/database/entities/*.ts',
  ],
  migrations: [
    'src/shared/infrastructure/database/migrations/*.ts',
  ],
  subscribers: [
    'src/shared/infrastructure/database/subscribers/*.ts',
  ],
});
