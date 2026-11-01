import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const schema = `
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  dumbbells INTEGER NOT NULL DEFAULT 0,
  kettlebells INTEGER NOT NULL DEFAULT 0,
  bench INTEGER NOT NULL DEFAULT 0,
  pull_up_bar INTEGER NOT NULL DEFAULT 0,
  band INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  block INTEGER NOT NULL DEFAULT 1,
  level INTEGER NOT NULL DEFAULT 0,
  assessed INTEGER NOT NULL DEFAULT 0,
  route TEXT NOT NULL DEFAULT 'balanced',
  dumbbell_weights TEXT NOT NULL DEFAULT '',
  movement_offsets TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS workout_logs (
  id INTEGER PRIMARY KEY,
  block INTEGER NOT NULL,
  day INTEGER NOT NULL,
  completed_at TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  sets_done INTEGER NOT NULL DEFAULT 0,
  sets_skipped INTEGER NOT NULL DEFAULT 0,
  bodyweight_only INTEGER NOT NULL DEFAULT 0,
  rating INTEGER
);
CREATE TABLE IF NOT EXISTS set_logs (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  block INTEGER NOT NULL,
  day INTEGER NOT NULL,
  exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER,
  seconds INTEGER,
  weight_kg REAL,
  target_reps INTEGER,
  target_seconds INTEGER
);
CREATE INDEX IF NOT EXISTS set_logs_block_day ON set_logs (block, day);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

// One connection per server process; kept on globalThis so dev reloads don't reopen it.
const globalForDb = globalThis as unknown as { homeWorkoutDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!globalForDb.homeWorkoutDb) {
    const dir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const database = new DatabaseSync(path.join(dir, "homeworkout.db"));
    database.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
    database.exec(schema);
    globalForDb.homeWorkoutDb = database;
  }
  return globalForDb.homeWorkoutDb;
}

export function transaction<T>(work: (database: DatabaseSync) => T): T {
  const database = db();
  database.exec("BEGIN");
  try {
    const result = work(database);
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
