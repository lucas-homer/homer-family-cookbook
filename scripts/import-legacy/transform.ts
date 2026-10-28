// Pure pg_dump parser and D1 transformer. Never include input values in errors.
export type Value = string | number | null;
export type Dump = Record<string, Value[][]>;
const widths: Record<string, number> = { Category: 5, Ingredient: 6, Note: 6, Password: 2, Recipe: 8, RecipeRead: 4, User: 7, UsersFavoriteRecipes: 3, _CategoryToRecipe: 2, _prisma_migrations: 8 };

export function parseDump(sql: string): Dump {
  // Backslashes in plain '...' literals are only literal characters when this is on.
  // pg_dump always sets it; refuse a dump that doesn't rather than mis-parse it.
  const firstInsert = sql.search(/^INSERT INTO /m);
  if (!/^SET standard_conforming_strings = on;/m.test(firstInsert < 0 ? sql : sql.slice(0, firstInsert))) {
    throw new Error('Dump must set standard_conforming_strings = on before its INSERTs');
  }
  const result: Dump = Object.fromEntries(Object.keys(widths).map(t => [t, []]));
  let i = 0;
  const fail = (): never => { throw new Error(`Unsupported or malformed dump at offset ${i}`); };
  const space = () => { while (/\s/.test(sql[i] ?? '') && i < sql.length) i++; };
  const literal = (): Value => {
    space();
    const escaped = /^[eE]'/.test(sql.slice(i, i + 2));
    if (escaped) i++;
    if (sql[i] === "'") {
      i++;
      let value = '';
      while (i < sql.length) {
        const c = sql[i++]!;
        if (c === "'") {
          if (sql[i] === "'") { value += "'"; i++; } else return value;
        } else if (c === '\\' && escaped) {
          const e = sql[i++];
          if (e === undefined) fail();
          const simple: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v' };
          if (e === 'x' || e === 'u' || e === 'U' || /[0-7]/.test(e!)) {
            const pattern = e === 'x' ? /^[0-9a-fA-F]{1,2}/ : e === 'u' ? /^[0-9a-fA-F]{4}/ : e === 'U' ? /^[0-9a-fA-F]{8}/ : /^[0-7]{1,3}/;
            if (/[0-7]/.test(e!)) i--;
            const digits = sql.slice(i).match(pattern)?.[0];
            if (!digits) fail();
            i += digits!.length;
            const code = parseInt(digits!, /[0-7]/.test(e!) ? 8 : 16);
            if (code > 0x10ffff) fail();
            value += String.fromCodePoint(code);
          } else value += simple[e!] ?? e!;
        } else value += c;
      }
      return fail();
    }
    const token = sql.slice(i).match(/^(NULL\b|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?)/i)?.[0];
    if (!token) return fail();
    i += token.length;
    if (token.toUpperCase() === 'NULL') return null;
    const number = Number(token);
    if (!Number.isFinite(number) || (Number.isInteger(number) && !Number.isSafeInteger(number))) return fail();
    return number;
  };
  while (i < sql.length) {
    space();
    if (sql.startsWith('--', i)) { const end = sql.indexOf('\n', i); i = end < 0 ? sql.length : end + 1; continue; }
    if (i >= sql.length) break;
    const header = sql.slice(i).match(/^INSERT\s+INTO\s+public\.(?:"([^"]+)"|(_prisma_migrations))\s+VALUES\s*/i);
    if (!header) {
      // pg_dump preamble/footer commands contain no row data.
      const end = sql.indexOf('\n', i);
      const line = sql.slice(i, end < 0 ? undefined : end).trim();
      if (!/^(SET\s|SELECT pg_catalog\.set_config\(|\\(?:un)?restrict\s)/.test(line)) fail();
      i = end < 0 ? sql.length : end + 1;
      continue;
    }
    const table = (header[1] ?? header[2])!;
    if (!(table in widths)) fail();
    i += header[0].length;
    while (true) {
      space(); if (sql[i++] !== '(') fail();
      const row: Value[] = [];
      while (true) {
        row.push(literal()); space();
        const delimiter = sql[i++];
        if (delimiter === ')') break;
        if (delimiter !== ',') fail();
      }
      if (row.length !== widths[table]) fail();
      result[table]!.push(row);
      space(); const delimiter = sql[i++];
      if (delimiter === ';') break;
      if (delimiter !== ',') fail();
    }
  }
  return result;
}

export function timestamp(value: Value | undefined): string {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(?:\.\d{1,3})?$/.test(value)) throw new Error('Invalid legacy timestamp');
  const date = new Date(value.replace(' ', 'T') + 'Z');
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid legacy timestamp');
  return date.toISOString();
}
export const targetTables = ['users', 'categories', 'recipes', 'ingredients', 'recipe_categories', 'notes', 'favorites', 'recipe_reads'] as const;
export function transform(dump: Dump) {
  const rows: Record<string, Value[][]> = {};
  const passwords = new Map(dump.Password!.map(r => [r[1], r[0]!]));
  rows.users = dump.User!.map(r => [r[0]!, r[1]!, r[6]!, r[4]!, r[5]!, passwords.get(r[0]) ?? null, timestamp(r[2]), timestamp(r[3])]);
  rows.categories = dump.Category!.map(r => [r[0]!, r[1]!, r[2]!, timestamp(r[3]), timestamp(r[4])]);
  rows.recipes = dump.Recipe!.map(r => [r[0]!, r[1]!, r[2]!, r[3]!, r[7]!, r[6]!, timestamp(r[4]), timestamp(r[5])]);
  const positions = new Map<Value, number>();
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  rows.ingredients = [...dump.Ingredient!].sort((a, b) => compare(timestamp(a[4]), timestamp(b[4])) || compare(String(a[0]), String(b[0]))).map(r => {
    const position = positions.get(r[3]!) ?? 0;
    positions.set(r[3]!, position + 1);
    return [r[0]!, r[3]!, position, r[1]!, r[2]!, timestamp(r[4]), timestamp(r[5])];
  });
  rows.recipe_categories = dump._CategoryToRecipe!.map(r => [r[1]!, r[0]!]);
  rows.notes = dump.Note!.map(r => [r[0]!, r[4]!, r[5]!, r[3]!, timestamp(r[1]), timestamp(r[2])]);
  rows.favorites = dump.UsersFavoriteRecipes!.map(r => [r[0]!, r[1]!, timestamp(r[2])]);
  rows.recipe_reads = dump.RecipeRead!.map(r => [r[0]!, r[1]!, timestamp(r[2]), timestamp(r[3])]);
  return rows;
}
const columns: Record<string, string> = {
  users: 'id,email,role,first_name,last_name,password_hash,created_at,updated_at',
  categories: 'id,name,description,created_at,updated_at', recipes: 'id,title,instructions,servings,background,user_id,created_at,updated_at',
  ingredients: 'id,recipe_id,position,name,quantity,created_at,updated_at', recipe_categories: 'recipe_id,category_id',
  notes: 'id,recipe_id,user_id,content,created_at,updated_at', favorites: 'recipe_id,user_id,created_at', recipe_reads: 'recipe_id,user_id,created_at,updated_at',
};
export const quote = (v: Value) => v === null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + v.replaceAll("'", "''") + "'";
export function emitSql(rows: Record<string, Value[][]>): string {
  const statements = ['-- Sensitive import: keep this file under ignored .import/.'];
  for (const table of [...targetTables].reverse().filter(t => t !== 'users')) statements.push(`DELETE FROM ${table};`);
  for (const user of rows.users!) {
    const id = quote(user[0]!);
    statements.push(`DELETE FROM sessions WHERE user_id = ${id};`);
    // Deleting an invite-referenced user would SET NULL on invites. Retain that
    // row and upsert it below, preserving both invite references and other users.
    statements.push(`DELETE FROM users WHERE id = ${id} AND NOT EXISTS (SELECT 1 FROM invites WHERE created_by = ${id} OR used_by = ${id});`);
  }
  for (const table of targetTables) for (const row of rows[table]!) {
    const upsert = table === 'users' ? ' ON CONFLICT(id) DO UPDATE SET ' + columns.users!.split(',').slice(1).map(c => `${c}=excluded.${c}`).join(',') : '';
    statements.push(`INSERT INTO ${table} (${columns[table]}) VALUES (${row.map(quote).join(',')})${upsert};`);
  }
  return statements.join('\n') + '\n';
}

export function audit(rows: Record<string, Value[][]>, dump: Dump): Record<string, number> {
  const users = new Set(rows.users!.map(r => r[0]));
  const recipes = new Set(rows.recipes!.map(r => r[0]));
  const categories = new Set(rows.categories!.map(r => r[0]));
  return {
    users_without_password: rows.users!.filter(r => r[5] === null).length,
    orphan_passwords: dump.Password!.filter(r => !users.has(r[1])).length,
    orphan_recipes: rows.recipes!.filter(r => !users.has(r[5])).length,
    orphan_ingredients: rows.ingredients!.filter(r => !recipes.has(r[1])).length,
    orphan_notes: rows.notes!.filter(r => !recipes.has(r[1]) || !users.has(r[2])).length,
    orphan_recipe_categories: rows.recipe_categories!.filter(r => !recipes.has(r[0]) || !categories.has(r[1])).length,
    orphan_favorites: rows.favorites!.filter(r => !recipes.has(r[0]) || !users.has(r[1])).length,
    orphan_recipe_reads: rows.recipe_reads!.filter(r => !recipes.has(r[0]) || !users.has(r[1])).length,
    replacement_characters: Object.values(dump).flat().flat().filter(v => typeof v === 'string' && v.includes('\ufffd')).length,
    nul_characters: Object.values(dump).flat().flat().filter(v => typeof v === 'string' && v.includes('\0')).length,
  };
}
