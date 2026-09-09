/// <reference types="node" />
import { initializeDatabase, clearDatabase, AppDataSource } from './src/shared/infrastructure/database/typeorm.config';
import runSeeds from './src/shared/infrastructure/database/seeds/run-seeds';
import { runInitialSeedsIfEmpty } from './src/shared/infrastructure/database/seeds/initial-seeds';

async function main() {
  const args = process.argv.slice(2);
  const shouldClean = args.includes('--clean') || args.includes('--clear');
  const onlyInit = args.includes('--init');

  if (process.env.NODE_ENV !== 'development') {
    console.log('Seeds abortados: NODE_ENV no es development');
    process.exit(0);
  }

  try {
    await initializeDatabase();
    if (shouldClean) {
      console.log('Limpiando base de datos (development)...');
      await clearDatabase();
    }

    console.log('Ejecutando seeds iniciales si es necesario...');
    await runInitialSeedsIfEmpty();
    if (onlyInit) return;

    console.log('Ejecutando seeds de prueba...');
    await runSeeds();
  } catch (err) {
    console.error('Error ejecutando seeds:', err);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

main();
