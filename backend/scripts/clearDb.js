import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RDBMS = new Database(path.join(__dirname, '..', 'autocrat_erp.RDBMS'));
const tables = ['fg_items', 'planners', 'work_orders', 'routing_steps'];

for (const t of tables) {
  try {
    const info = RDBMS.prepare(`DELETE FROM "${t}"`).run();
    console.log(`[CLEAR] ${t} -> ${info.changes} rows deleted`);
  } catch (e) {
    console.error(`[ERROR] ${t}:`, e.message);
  }
}
RDBMS.close();
console.log('Done. All tables are now empty.');
