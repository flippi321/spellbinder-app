/**
 * Regenerates src/data/mock/cards.json — the real Scryfall data (ids, oracle ids, images)
 * behind the mock seed, which lists cards by name.
 *
 *   npm run seed:cards
 *
 * Run it after adding cards to the seed. It goes through the app's own rate-limited
 * Scryfall client (batched /cards/collection, 500 ms apart, required headers).
 */
import { writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { allSeedCardNames } from '../src/data/mock/seed';
import { createScryfallClient } from '../src/services/scryfallClient';
import { slimCard } from '../src/utils/cards';

const OUTPUT = resolve(process.cwd(), 'src/data/mock/cards.json');

async function main() {
  const names = allSeedCardNames();
  console.log(`Resolving ${names.length} seed cards with Scryfall /cards/collection…`);

  const client = createScryfallClient({
    fetch: (input, init) => fetch(input, init),
    userAgent: 'Spellbinder/0.1.0 (seed script)',
  });
  const { cards, notFound } = await client.getCollection(names.map((name) => ({ name })));

  if (notFound.length > 0) {
    console.error('Scryfall could not find these names — fix them in src/data/mock/seed:', notFound);
    process.exitCode = 1;
    return;
  }

  const slim = cards.map(slimCard).sort((a, b) => a.name.localeCompare(b.name));
  // One card per line keeps diffs readable without bloating the bundle.
  const body = slim.map((card) => `    ${JSON.stringify(card)}`).join(',\n');
  writeFileSync(
    OUTPUT,
    `{\n  "source": "https://api.scryfall.com/cards/collection",\n  "generatedAt": "${new Date().toISOString()}",\n  "cards": [\n${body}\n  ]\n}\n`,
  );
  console.log(`Wrote ${slim.length} cards to ${relative(process.cwd(), OUTPUT)}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
