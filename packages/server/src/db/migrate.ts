import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, sqliteClient } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.info('Running database migrations...');
  try {
    // Migration files are generated into the packages/server/drizzle folder
    const migrationsFolder = path.resolve(__dirname, '../../drizzle');
    migrate(db, { migrationsFolder });
    console.info('Database migrations applied successfully.');
  } catch (error) {
    console.error('Failed to run database migrations:', error);
    process.exit(1);
  }
}

// Execute migration if script is called directly
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  runMigrations()
    .then(() => {
      console.info('Closing database connection after direct migration run...');
      sqliteClient.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Direct migration execution error:', err);
      process.exit(1);
    });
}
