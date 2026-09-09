import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

export { AppDataSource, AppDataSource as default } from './src/shared/infrastructure/database/typeorm.config';
