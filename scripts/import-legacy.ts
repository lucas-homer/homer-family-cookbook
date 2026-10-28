/**
 * Local only (Node 24+, no packages needed):
 * node --experimental-strip-types scripts/import-legacy.ts <dump.sql> .import/legacy.sql
 * WRANGLER_WRITE_LOGS=false npx wrangler d1 migrations apply DB --local
 * WRANGLER_WRITE_LOGS=false npx wrangler d1 execute DB --local --file .import/legacy.sql
 * node --experimental-strip-types scripts/verify-import.ts <dump.sql>
 * Output contains personal data and hashes. Never print or commit it.
 *
 * This is a one-time cutover load, not a merge: the output deletes every
 * category, recipe, ingredient, note, favorite and read before inserting the
 * dump's rows. Don't run it against a database that has new content in it.
 */
import { mkdirSync, readFileSync, realpathSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
// @ts-ignore Node strip-types requires explicit .ts extension.
import { parseDump, transform, emitSql, audit, targetTables } from './import-legacy/transform.ts';

try {
  const [input, output] = process.argv.slice(2);
  if (!input || !output || process.argv.length !== 4) throw new Error('usage');
  const root = resolve('.import');
  const target = resolve(output);
  const rel = relative(root, target);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('path');
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  if (realpathSync(root) !== root || realpathSync(dirname(target)) !== dirname(target)) throw new Error('symlink');
  const dump = parseDump(readFileSync(input, 'utf8'));
  const rows = transform(dump);
  const oddities = audit(rows, dump);
  if (Object.entries(oddities).some(([key, count]) => count > 0 && (key.startsWith('orphan_') || key === 'nul_characters'))) throw new Error('integrity');
  // wx avoids following an existing symlink; remove an old output explicitly before rerunning.
  writeFileSync(target, emitSql(rows), { mode: 0o600, flag: 'wx' });
  chmodSync(target, 0o600);
  console.log(JSON.stringify({ counts: Object.fromEntries(targetTables.map(t => [t, rows[t]!.length])), oddities }));
} catch {
  console.error('Import failed. Check arguments, dump format/integrity, and that output is a new file under .import/. No row values are logged.');
  process.exitCode = 1;
}
