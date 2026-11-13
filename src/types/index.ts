export type StatName = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';

export const STAT_LABELS: Record<StatName, string> = {
  hp:  'HP',
  atk: 'Attack',
  def: 'Defense',
  spa: 'Sp. Atk',
  spd: 'Sp. Def',
  spe: 'Speed',
};

export const STAT_ORDER: StatName[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

export interface BaseStats {
  hp:  number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export type EggGroup =
  | 'monster' | 'water1' | 'bug' | 'flying' | 'field' | 'fairy'
  | 'grass' | 'humanlike' | 'water3' | 'mineral' | 'amorphous'
  | 'water2' | 'ditto' | 'dragon' | 'undiscovered';

export type NatureName =
  | 'Hardy' | 'Lonely' | 'Brave' | 'Adamant' | 'Naughty'
  | 'Bold' | 'Docile' | 'Relaxed' | 'Impish' | 'Lax'
  | 'Timid' | 'Hasty' | 'Serious' | 'Jolly' | 'Naive'
  | 'Modest' | 'Mild' | 'Quiet' | 'Bashful' | 'Rash'
  | 'Calm' | 'Gentle' | 'Sassy' | 'Careful' | 'Quirky';

export interface NatureData {
  name: NatureName;
  increased: StatName | null;
  decreased: StatName | null;
}

export interface PokemonEntry {
  id: number;
  name: string;
  slug: string;
  types: string[];
  baseStats: BaseStats;
  eggGroups: string[];
}

export interface IVRange {
  min: number;
  max: number;
  possible: number[];
}

export type IVResult = Record<StatName, IVRange>;

// ── PC Box ────────────────────────────────────────────────────────────────────

export interface BoxPokemon {
  uid: string;
  species: string;       // slug / name
  nickname: string;
  nature: NatureName;
  ivs: BaseStats;
  evs: BaseStats;
  level: number;
  moves: [string, string, string, string];
  shiny: boolean;
  gender: 'M' | 'F' | '?';
  notes: string;
  createdAt: number;
}

export interface PCBox {
  id: string;
  name: string;
  /** 30 slots, null = empty */
  slots: (BoxPokemon | null)[];
}

// ── Breeding planner ─────────────────────────────────────────────────────────

export type IVTarget = Partial<Record<StatName, 31>>;

export interface BreedingStep {
  generation: number;
  parent1: BreedingParent;
  parent2: BreedingParent;
  offspring: BreedingParent;
  heldItems: { parent1?: string; parent2?: string };
}

export interface BreedingParent {
  label: string;
  ivs: Partial<BaseStats>;  // only the IVs that matter for this step
}
