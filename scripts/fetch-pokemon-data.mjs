/**
 * Fetches Gen 1-5 Pokemon data from PokéAPI and writes to src/data/pokemon.json
 * Run once: node scripts/fetch-pokemon-data.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '../src/data/pokemon.json');
const TOTAL = 649; // Gen 1-5
const CONCURRENCY = 10;
const DELAY_MS = 200;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}

async function fetchOne(id) {
  const [poke, species] = await Promise.all([
    fetchJSON(`https://pokeapi.co/api/v2/pokemon/${id}`),
    fetchJSON(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
  ]);
  const enName = species.names.find(n => n.language.name === 'en')?.name ?? poke.name;
  return {
    id: poke.id,
    name: enName,
    slug: poke.name,
    types: poke.types.map(t => t.type.name),
    baseStats: {
      hp:  poke.stats.find(s => s.stat.name === 'hp').base_stat,
      atk: poke.stats.find(s => s.stat.name === 'attack').base_stat,
      def: poke.stats.find(s => s.stat.name === 'defense').base_stat,
      spa: poke.stats.find(s => s.stat.name === 'special-attack').base_stat,
      spd: poke.stats.find(s => s.stat.name === 'special-defense').base_stat,
      spe: poke.stats.find(s => s.stat.name === 'speed').base_stat,
    },
    eggGroups: species.egg_groups.map(g => g.name),
  };
}

async function main() {
  const results = [];
  const ids = Array.from({ length: TOTAL }, (_, i) => i + 1);

  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(fetchOne));
    results.push(...batchResults);
    console.log(`Fetched ${Math.min(i + CONCURRENCY, TOTAL)}/${TOTAL}`);
    if (i + CONCURRENCY < ids.length) await sleep(DELAY_MS);
  }

  results.sort((a, b) => a.id - b.id);
  mkdirSync(join(__dirname, '../src/data'), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`✓ Written ${results.length} Pokemon to ${OUT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
