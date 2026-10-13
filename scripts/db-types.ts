/**
 * Regenerates src/types/database.ts — the TypeScript types of the Supabase schema — from the linked project.
 *
 *   npm run db:types          write the file (run it after every migration that reaches the remote)
 *   npm run db:types:check    exit 1 if the committed file is out of date (for CI, X-3)
 *
 * It runs the spellbinder-db repo's own `types` script (`supabase gen types typescript --linked`), so the CLI version
 * and the project link live in one place. Needs `../spellbinder-db` next to this repo, linked and logged in
 * (`npx supabase login` + `npx supabase link` there).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const OUTPUT = resolve(process.cwd(), 'src/types/database.ts');
const DB_REPO = resolve(process.cwd(), '../spellbinder-db');
const check = process.argv.includes('--check');

/** Line endings differ between checkouts (core.autocrlf); compare and write with \n. */
const normalize = (text: string) => text.replace(/\r\n/g, '\n');

function main() {
  if (!existsSync(resolve(DB_REPO, 'package.json'))) {
    console.error(`Expected the spellbinder-db repo at ${DB_REPO}.`);
    process.exit(1);
  }

  // One command string: Node warns about passing an args array together with `shell`.
  const result = spawnSync('npm run --silent types', {
    cwd: DB_REPO,
    encoding: 'utf8',
    shell: true, // npm is npm.cmd on Windows
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0 || !result.stdout.includes('export type Database')) {
    console.error(result.stderr || result.stdout || 'supabase gen types failed.');
    process.exit(1);
  }
  const generated = normalize(result.stdout);

  if (check) {
    const committed = existsSync(OUTPUT) ? normalize(readFileSync(OUTPUT, 'utf8')) : '';
    if (committed !== generated) {
      console.error(`${relative(process.cwd(), OUTPUT)} is out of date. Run \`npm run db:types\` and commit it.`);
      process.exit(1);
    }
    console.log(`${relative(process.cwd(), OUTPUT)} matches the database.`);
    return;
  }

  writeFileSync(OUTPUT, generated);
  console.log(`Wrote ${relative(process.cwd(), OUTPUT)}.`);
}

main();
