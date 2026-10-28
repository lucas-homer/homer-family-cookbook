import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { audit, emitSql, parseDump, timestamp, transform } from '../scripts/import-legacy/transform';

const date = '2022-05-03 18:02:51.409';
const SCS = "SET standard_conforming_strings = on;\n";
const fixture = `
-- Synthetic data only.
SET standard_conforming_strings = on;
INSERT INTO public."User" VALUES ('u','fake@example.test','${date}','${date}','Fake',NULL,'ADMIN');
INSERT INTO public."Password" VALUES ('fake-hash','u');
INSERT INTO public."Category" VALUES ('c','Dinner',NULL,'${date}','${date}');
INSERT INTO public."Recipe" VALUES ('r','Chef''s stew','First line
Second line; (still instructions)',NULL,'${date}','${date}','u',NULL);
INSERT INTO public."Ingredient" VALUES ('z','Salt',NULL,'r','${date}','${date}'), ('a','Water','1','r','${date}','${date}'), ('early','Herb','2','r','2021-01-01 00:00:00','${date}');
INSERT INTO public."_CategoryToRecipe" VALUES ('c','r');
INSERT INTO public."Note" VALUES ('n','${date}','${date}','Fake note','r','u');
INSERT INTO public."RecipeRead" VALUES ('r','u','${date}','${date}');
INSERT INTO public."UsersFavoriteRecipes" VALUES ('r','u','${date}');
`;

describe('legacy dump parser', () => {
  it('handles quotes, literal newlines, NULL and multi-row statements', () => {
    const dump = parseDump(fixture);
    expect(dump.Recipe![0]![1]).toBe("Chef's stew");
    expect(dump.Recipe![0]![2]).toBe('First line\nSecond line; (still instructions)');
    expect(dump.User![0]![5]).toBeNull();
    expect(dump.Ingredient).toHaveLength(3);
  });
  it('handles E strings, octal/hex/unicode escapes, numbers and standard backslashes', () => {
    const dump = parseDump(SCS + String.raw`INSERT INTO public."Password" VALUES (E'quote\' slash\\ line\n\101\x42\u0043\U00000044', -12.5e1); INSERT INTO public."Password" VALUES ('literal\n', NULL);`);
    expect(dump.Password).toEqual([["quote' slash\\ line\nABCD", -125], ['literal\\n', null]]);
  });
  it('accepts and ignores Prisma migration history during transformation', () => {
    const dump = parseDump(fixture + `INSERT INTO public._prisma_migrations VALUES ('m','checksum',NULL,'migration',NULL,NULL,'2022-05-03 18:02:51+00',1);`);
    expect(transform(dump).recipes).toHaveLength(1);
    expect(transform(dump)._prisma_migrations).toBeUndefined();
  });
  it('rejects malformed or unknown rows without exposing values', () => {
    for (const sql of ["INSERT INTO public.\"Password\" VALUES ('sensitive');", "INSERT INTO public.\"Unknown\" VALUES ('sensitive');", "INSERT INTO public.\"Password\" VALUES ('sensitive, NULL);", 'DELETE FROM users;']) {
      expect(() => parseDump(SCS + sql)).toThrow(/Unsupported or malformed dump at offset \d+$/);
    }
  });

  it('refuses a dump that does not turn on standard_conforming_strings', () => {
    expect(() => parseDump("INSERT INTO public.\"Password\" VALUES ('x', NULL);")).toThrow(/standard_conforming_strings/);
  });
});

describe('legacy transformation', () => {
  it('converts naive UTC timestamps with millisecond precision', () => {
    expect(timestamp(date)).toBe('2022-05-03T18:02:51.409Z');
    expect(timestamp('2022-05-03 18:02:51')).toBe('2022-05-03T18:02:51.000Z');
    expect(timestamp('2022-05-03 18:02:51.4')).toBe('2022-05-03T18:02:51.400Z');
    expect(() => timestamp(null)).toThrow('Invalid legacy timestamp');
  });
  it('merges passwords, preserves roles/NULLs and maps Prisma A/B correctly', () => {
    const rows = transform(parseDump(fixture));
    expect(rows.users![0]).toEqual(['u','fake@example.test','ADMIN','Fake',null,'fake-hash','2022-05-03T18:02:51.409Z','2022-05-03T18:02:51.409Z']);
    expect(rows.recipe_categories).toEqual([['r','c']]);
    expect(rows.recipes![0]![4]).toBeNull();
  });
  it('orders ingredient positions by timestamp then id, restarting per recipe', () => {
    const dump = parseDump(fixture + `INSERT INTO public."Ingredient" VALUES ('other','Other',NULL,'r2','${date}','${date}');`);
    expect(transform(dump).ingredients!.map(r => [r[0], r[2]])).toEqual([['early',0], ['a',1], ['other',0], ['z',2]]);
  });
  it('reports missing passwords, orphans and encoding oddities as counts', () => {
    const dump = parseDump(fixture);
    dump.Password = [];
    dump.Ingredient![0]![3] = 'missing';
    dump.Note![0]![3] = '\ufffd';
    const report = audit(transform(dump), dump);
    expect(report.users_without_password).toBe(1);
    expect(report.orphan_ingredients).toBe(1);
    expect(report.replacement_characters).toBe(1);
  });
  it('loads twice with foreign keys, preserving invites and unrelated sessions', async () => {
    const rows = transform(parseDump(fixture));
    // Split at statement ends, preserving literal newlines within strings.
    const load = async () => {
      const sql = emitSql(rows).split('\n').slice(1).join('\n');
      for (const statement of sql.split(/;\n/).filter(s => s.trim())) await env.DB.prepare(statement).run();
    };
    await load();
    await env.DB.prepare("INSERT INTO users (id,email,first_name) VALUES ('other','other@example.test','Other')").run();
    await env.DB.prepare("INSERT INTO invites (id,token_hash,created_by,used_by,expires_at) VALUES ('invite','fake-token','u','u','2099')").run();
    await env.DB.prepare("INSERT INTO sessions (id,user_id,expires_at) VALUES ('imported','u','2099'),('unrelated','other','2099')").run();
    await load();
    expect(await env.DB.prepare('SELECT count(*) AS count FROM ingredients').first('count')).toBe(3);
    expect(await env.DB.prepare('SELECT created_by,used_by FROM invites').first()).toEqual({ created_by: 'u', used_by: 'u' });
    expect(await env.DB.prepare('SELECT id FROM sessions').all()).toMatchObject({ results: [{ id: 'unrelated' }] });
    expect((await env.DB.prepare('PRAGMA foreign_key_check').all()).results).toEqual([]);
  });
});
