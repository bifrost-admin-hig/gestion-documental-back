import { AppDataSource } from '@shared/infrastructure/database/typeorm.config';
import { runSampleSeeds } from '@shared/infrastructure/database/seeds/sample-seeds';

export default async function runSeeds() {
  try {
    await runSampleSeeds();
    console.log('Seed ejecutado correctamente');
  } catch (err) {
    console.error('Error ejecutando seed:', err);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}
