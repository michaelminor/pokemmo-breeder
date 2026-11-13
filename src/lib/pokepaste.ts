import { BoxPokemon, NatureName, StatName, BaseStats } from '@/types';
import { findPokemon } from './pokemon';
import { NATURES } from '@/data/natures';

// Showdown stat abbreviation → our StatName
const STAT_ABBR: Record<string, StatName> = {
  HP:  'hp',
  Atk: 'atk',
  Def: 'def',
  SpA: 'spa',
  SpD: 'spd',
  Spe: 'spe',
};

function parseStatSegments(text: string): Partial<BaseStats> {
  const result: Partial<BaseStats> = {};
  for (const seg of text.split('/')) {
    const m = seg.trim().match(/^(\d+)\s+(\w+)$/);
    if (m) {
      const stat = STAT_ABBR[m[2]];
      if (stat) result[stat] = parseInt(m[1]);
    }
  }
  return result;
}

export interface PokepasteResult {
  pokemon: Omit<BoxPokemon, 'uid' | 'createdAt'>[];
  warnings: string[];
}

/**
 * Parse a Showdown / Pokepaste text block into BoxPokemon entries.
 * Multiple Pokemon are separated by blank lines.
 */
export function parsePokepaste(raw: string): PokepasteResult {
  const warnings: string[] = [];
  const pokemon: Omit<BoxPokemon, 'uid' | 'createdAt'>[] = [];

  const blocks = raw.trim().split(/\n[ \t]*\n/);
  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const result = parseBlock(lines, warnings);
    if (result) pokemon.push(result);
  }

  return { pokemon, warnings };
}

function parseBlock(
  lines: string[],
  warnings: string[],
): Omit<BoxPokemon, 'uid' | 'createdAt'> | null {
  // defaults
  const ivs: BaseStats   = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
  const evs: BaseStats   = { hp: 0,  atk: 0,  def: 0,  spa: 0,  spd: 0,  spe: 0  };
  const moves: [string, string, string, string] = ['', '', '', ''];
  let species  = '';
  let nickname = '';
  let nature: NatureName = 'Hardy';
  let level   = 50;
  let shiny   = false;
  let gender: 'M' | 'F' | '?' = '?';
  let notes   = '';
  let moveIdx = 0;

  // ── Line 0: name + optional item ──────────────────────────────────────────
  const firstLine = lines[0];
  const atIdx = firstLine.indexOf(' @ ');
  const namePart = atIdx >= 0 ? firstLine.slice(0, atIdx) : firstLine;

  // Gender in name: "Nidoqueen (F)" — must be checked before nickname check
  const genderInName = namePart.match(/\s+\((M|F)\)$/);
  const cleanName = genderInName ? namePart.slice(0, genderInName.index) : namePart;
  if (genderInName) gender = genderInName[1] as 'M' | 'F';

  // Nickname format: "Nickname (Species)"
  const nicknameMatch = cleanName.match(/^(.+?)\s+\(([^)]+)\)$/);
  if (nicknameMatch) {
    nickname = nicknameMatch[1].trim();
    species  = nicknameMatch[2].trim();
  } else {
    species = cleanName.trim();
  }

  // ── Remaining lines ────────────────────────────────────────────────────────
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('- ')) {
      if (moveIdx < 4) moves[moveIdx++] = line.slice(2).trim();
      continue;
    }
    if (line.startsWith('Level: ')) {
      level = parseInt(line.slice(7)) || 50;
      continue;
    }
    if (line.startsWith('Shiny: Yes')) {
      shiny = true;
      continue;
    }
    if (line.startsWith('EVs: ')) {
      Object.assign(evs, parseStatSegments(line.slice(5)));
      continue;
    }
    if (line.startsWith('IVs: ')) {
      Object.assign(ivs, parseStatSegments(line.slice(5)));
      continue;
    }
    if (line.endsWith(' Nature')) {
      const n = line.slice(0, -7) as NatureName;
      if (NATURES.find(x => x.name === n)) nature = n;
      continue;
    }
    // Ability / item lines are ignored (not tracked in our schema)
  }

  if (!species) return null;

  // Try to normalise species name via our Pokemon database
  const found = findPokemon(species);
  if (!found) {
    warnings.push(`"${species}" not found in the database — entry added with unknown species.`);
  } else {
    species = found.name;
  }

  return { species, nickname, nature, ivs, evs, level, moves, shiny, gender, notes };
}
