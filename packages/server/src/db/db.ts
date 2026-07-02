import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import type { Database as SqliteDatabase } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import * as schema from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Place SQLite database file in the server directory root
const dbPath = path.resolve(__dirname, '../../../sqlite.db');

console.info(`Connecting to SQLite Database at: ${dbPath}`);
export const sqliteClient: SqliteDatabase = new Database(dbPath);

// Enable SQLite foreign key constraints (critical for reference checks)
sqliteClient.pragma('foreign_keys = ON');

export const db = drizzle(sqliteClient, { schema });
export type DatabaseInstance = typeof db;
