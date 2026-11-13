import { PCBox, BoxPokemon } from '@/types';

const BOXES_KEY = 'pokemmo_boxes';

function isClient() {
  return typeof window !== 'undefined';
}

export function loadBoxes(): PCBox[] {
  if (!isClient()) return defaultBoxes();
  try {
    const raw = localStorage.getItem(BOXES_KEY);
    if (!raw) return defaultBoxes();
    return JSON.parse(raw) as PCBox[];
  } catch {
    return defaultBoxes();
  }
}

export function saveBoxes(boxes: PCBox[]): void {
  if (!isClient()) return;
  localStorage.setItem(BOXES_KEY, JSON.stringify(boxes));
}

export function addBox(boxes: PCBox[], name = 'New Box'): PCBox[] {
  const newBox: PCBox = {
    id: crypto.randomUUID(),
    name,
    slots: Array(30).fill(null),
  };
  return [...boxes, newBox];
}

export function renameBox(boxes: PCBox[], boxId: string, name: string): PCBox[] {
  return boxes.map(b => b.id === boxId ? { ...b, name } : b);
}

export function deleteBox(boxes: PCBox[], boxId: string): PCBox[] {
  if (boxes.length <= 1) return boxes; // keep at least one box
  return boxes.filter(b => b.id !== boxId);
}

export function addPokemonToBox(
  boxes: PCBox[],
  boxId: string,
  slot: number,
  pokemon: BoxPokemon,
): PCBox[] {
  return boxes.map(b => {
    if (b.id !== boxId) return b;
    const newSlots = [...b.slots];
    newSlots[slot] = pokemon;
    return { ...b, slots: newSlots };
  });
}

export function removePokemonFromBox(
  boxes: PCBox[],
  boxId: string,
  slot: number,
): PCBox[] {
  return boxes.map(b => {
    if (b.id !== boxId) return b;
    const newSlots = [...b.slots];
    newSlots[slot] = null;
    return { ...b, slots: newSlots };
  });
}

export function movePokemon(
  boxes: PCBox[],
  fromBoxId: string,
  fromSlot: number,
  toBoxId: string,
  toSlot: number,
): PCBox[] {
  const pokemon = boxes.find(b => b.id === fromBoxId)?.slots[fromSlot];
  if (!pokemon) return boxes;
  let updated = removePokemonFromBox(boxes, fromBoxId, fromSlot);
  updated = addPokemonToBox(updated, toBoxId, toSlot, pokemon);
  return updated;
}

function defaultBoxes(): PCBox[] {
  return [
    { id: crypto.randomUUID(), name: 'Box 1', slots: Array(30).fill(null) },
  ];
}

export function emptyPokemon(): BoxPokemon {
  return {
    uid: crypto.randomUUID(),
    species: '',
    nickname: '',
    nature: 'Hardy',
    ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    level: 1,
    moves: ['', '', '', ''],
    shiny: false,
    gender: 'M',
    notes: '',
    createdAt: Date.now(),
  };
}
