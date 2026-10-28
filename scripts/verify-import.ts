/** Local-only count and integrity verification. See import-legacy.ts for usage. */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
// @ts-ignore Node strip-types requires explicit .ts extension.
import { parseDump, transform, targetTables } from './import-legacy/transform.ts';
try {
  const [input] = process.argv.slice(2);
  if (!input || process.argv.length !== 3) throw new Error('usage');
  const rows = transform(parseDump(readFileSync(input, 'utf8')));
  // D1 limits compound SELECT terms; scalar subqueries avoid that limit.
  const query = 'SELECT ' + targetTables.map(t => `(SELECT count(*) FROM ${t}) AS ${t}`).join(', ');
  // Capture subprocess output so a failure can never echo sensitive query results.
  const execute = (command: string) => JSON.parse(execFileSync('npx', ['--no-install', 'wrangler', 'd1', 'execute', 'DB', '--local', '--json', '--command', command], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WRANGLER_WRITE_LOGS: 'false' } })) as { results: Record<string, unknown>[] }[];
  const actual = execute(query).flatMap(r => r.results);
  let valid = true;
  for (const table of targetTables) {
    const count = Number(actual[0]?.[table]);
    console.log(`${table}: expected=${rows[table]!.length} actual=${count}`);
    if (count !== rows[table]!.length) valid = false;
  }
  const violations = execute('PRAGMA foreign_key_check;').flatMap(r => r.results).length;
  console.log(`foreign_key_violations: ${violations}`);
  const positions = execute('SELECT count(*) AS count FROM (SELECT recipe_id FROM ingredients GROUP BY recipe_id HAVING min(position) <> 0 OR max(position) <> count(*) - 1 OR count(DISTINCT position) <> count(*));').flatMap(r => r.results);
  const badPositions = Number(positions[0]?.count);
  console.log(`invalid_ingredient_position_groups: ${badPositions}`);
  if (!valid || violations !== 0 || badPositions !== 0) process.exitCode = 1;
} catch {
  console.error('Verification failed. Check dump argument and local D1 setup. No row values are logged.');
  process.exitCode = 1;
}
