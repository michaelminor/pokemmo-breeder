import { StatName, STAT_ORDER } from '@/types';

export interface PowerItem {
  stat: StatName;
  name: string;
}

export const POWER_ITEMS: PowerItem[] = [
  { stat: 'hp',  name: 'Power Weight' },
  { stat: 'atk', name: 'Power Bracer' },
  { stat: 'def', name: 'Power Belt' },
  { stat: 'spa', name: 'Power Lens' },
  { stat: 'spd', name: 'Power Band' },
  { stat: 'spe', name: 'Power Anklet' },
];

export const POWER_ITEM_MAP = new Map(POWER_ITEMS.map(p => [p.stat, p]));

export type TargetIVs = Partial<Record<StatName, boolean>>;

export interface BreedingNode {
  id: string;
  label: string;
  /** IVs this Pokemon needs to have */
  neededIVs: StatName[];
  /** IVs it passes to the next step */
  passIVs: StatName[];
  /** Held item during breeding */
  heldItem: string | null;
  /** How many eggs are expected to get this result */
  expectedEggs: number;
}

export interface BreedingStep {
  stepNumber: number;
  parent1: BreedingNode;
  parent2: BreedingNode;
  offspring: BreedingNode;
  notes: string;
}

export interface BreedingPlan {
  targetPokemon: string;
  targetIVs: StatName[];
  steps: BreedingStep[];
  totalExpectedEggs: number;
  estimatedCost: string;
}

/**
 * Generates an optimal breeding plan to get a Pokemon with all specified perfect IVs.
 *
 * Strategy (standard PokeMMO / Gen 5 Destiny Knot method):
 *  - Start with separate parents each perfect in 1 IV
 *  - Use Power Items to lock the desired IV each generation
 *  - Combine IVs over multiple generations until you have all targets
 *
 * Each step reduces the problem: merge 2 IVs at a time, building up.
 */
export function generateBreedingPlan(
  targetPokemon: string,
  targetIVs: StatName[],
): BreedingPlan {
  if (targetIVs.length === 0) {
    return {
      targetPokemon,
      targetIVs: [],
      steps: [],
      totalExpectedEggs: 0,
      estimatedCost: '0',
    };
  }

  const steps: BreedingStep[] = [];
  let stepNumber = 1;

  // Each "working set" is a list of nodes we're building toward.
  // We pair them up left to right, merging 2 at a time.
  let currentNodes: BreedingNode[] = targetIVs.map((stat, i) => ({
    id: `base-${i}`,
    label: `Parent (31 ${stat.toUpperCase()})`,
    neededIVs: [stat],
    passIVs: [stat],
    heldItem: POWER_ITEM_MAP.get(stat)?.name ?? null,
    expectedEggs: 1, // obtained from in-game / market
  }));

  while (currentNodes.length > 1) {
    const nextNodes: BreedingNode[] = [];

    for (let i = 0; i < currentNodes.length; i += 2) {
      if (i + 1 >= currentNodes.length) {
        // Odd one out — carry forward to next round
        nextNodes.push(currentNodes[i]);
        continue;
      }

      const p1 = currentNodes[i];
      const p2 = currentNodes[i + 1];
      const combinedIVs = [...new Set([...p1.passIVs, ...p2.passIVs])];

      // Determine held items for this step
      // With Destiny Knot, we don't need Power Items once we have 2+ IVs per parent,
      // but they still help lock specific IVs when each parent only has 1.
      const p1Item = p1.passIVs.length === 1
        ? (POWER_ITEM_MAP.get(p1.passIVs[0])?.name ?? null)
        : 'Destiny Knot';
      const p2Item = p2.passIVs.length === 1
        ? (POWER_ITEM_MAP.get(p2.passIVs[0])?.name ?? null)
        : 'Destiny Knot';

      // Expected eggs to get all combined IVs:
      // With 2 Power Items: guaranteed to pass both specific IVs + 3 random from 10 remaining
      // Simplified estimate: ~5-15 eggs per step
      const eggEstimate = combinedIVs.length <= 2 ? 5 : combinedIVs.length <= 4 ? 15 : 30;

      const offspring: BreedingNode = {
        id: `step-${stepNumber}`,
        label:
          combinedIVs.length === targetIVs.length
            ? `Target (31 in ${combinedIVs.join(', ')})`
            : `Intermediate (31 in ${combinedIVs.join(', ')})`,
        neededIVs: combinedIVs,
        passIVs: combinedIVs,
        heldItem: null,
        expectedEggs: eggEstimate,
      };

      const notes = buildStepNotes(p1, p2, p1Item, p2Item, combinedIVs);

      steps.push({
        stepNumber,
        parent1: { ...p1, heldItem: p1Item },
        parent2: { ...p2, heldItem: p2Item },
        offspring,
        notes,
      });

      nextNodes.push(offspring);
      stepNumber++;
    }

    currentNodes = nextNodes;
  }

  const totalEggs = steps.reduce((sum, s) => sum + s.offspring.expectedEggs, 0);

  return {
    targetPokemon,
    targetIVs,
    steps,
    totalExpectedEggs: totalEggs,
    estimatedCost: estimateCost(totalEggs),
  };
}

function buildStepNotes(
  p1: BreedingNode,
  p2: BreedingNode,
  p1Item: string | null,
  p2Item: string | null,
  combinedIVs: StatName[],
): string {
  const parts: string[] = [];
  if (p1Item) parts.push(`Give ${p1.label.split('(')[0].trim()} a ${p1Item}`);
  if (p2Item && p2Item !== p1Item) parts.push(`give ${p2.label.split('(')[0].trim()} a ${p2Item}`);
  parts.push(`breed to get offspring with 31 in ${combinedIVs.map(s => s.toUpperCase()).join(', ')}`);
  return parts.join(', ') + '.';
}

function estimateCost(totalEggs: number): string {
  // Very rough PokeMMO cost estimate: ~500-2000 Yen per egg attempt
  const low = totalEggs * 500;
  const high = totalEggs * 2000;
  return `${(low / 1000).toFixed(0)}k – ${(high / 1000).toFixed(0)}k yen`;
}

/** Returns stats that benefit most from 31 IVs for a given role */
export function getSuggestedIVs(role: 'physical' | 'special' | 'mixed' | 'support'): StatName[] {
  switch (role) {
    case 'physical': return ['hp', 'atk', 'def', 'spd', 'spe'];
    case 'special':  return ['hp', 'def', 'spa', 'spd', 'spe'];
    case 'mixed':    return ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    case 'support':  return ['hp', 'def', 'spd'];
  }
}
