import pokemonData from '@/data/pokemon.json';
import { PokemonEntry } from '@/types';

const ALL_POKEMON = pokemonData as PokemonEntry[];

/** Full sorted list */
export function getAllPokemon(): PokemonEntry[] {
  return ALL_POKEMON;
}

/** Find a single Pokemon by slug or name (case-insensitive) */
export function findPokemon(query: string): PokemonEntry | undefined {
  const q = query.toLowerCase().trim();
  return ALL_POKEMON.find(
    p => p.slug === q || p.name.toLowerCase() === q,
  );
}

/** Fuzzy search for the autocomplete dropdown */
export function searchPokemon(query: string, limit = 20): PokemonEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return ALL_POKEMON.slice(0, limit);
  return ALL_POKEMON
    .filter(p => p.name.toLowerCase().includes(q) || p.slug.includes(q))
    .slice(0, limit);
}

export const TYPE_COLORS: Record<string, string> = {
  normal:   'bg-stone-400',
  fire:     'bg-orange-500',
  water:    'bg-blue-500',
  electric: 'bg-yellow-400',
  grass:    'bg-green-500',
  ice:      'bg-cyan-300',
  fighting: 'bg-red-700',
  poison:   'bg-purple-500',
  ground:   'bg-yellow-600',
  flying:   'bg-indigo-400',
  psychic:  'bg-pink-500',
  bug:      'bg-lime-500',
  rock:     'bg-yellow-700',
  ghost:    'bg-violet-700',
  dragon:   'bg-indigo-700',
  dark:     'bg-zinc-700',
  steel:    'bg-slate-400',
};

export const STAT_BAR_MAX = 255;

export function statBarWidth(value: number): number {
  return Math.min(100, Math.round((value / STAT_BAR_MAX) * 100));
}
