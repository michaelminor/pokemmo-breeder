'use client';

import { useState, useEffect } from 'react';
import { Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import PokemonSearch from '@/components/PokemonSearch';
import { NATURES } from '@/data/natures';
import { findPokemon, TYPE_COLORS } from '@/lib/pokemon';
import {
  loadBoxes, saveBoxes, addBox, renameBox, deleteBox,
  addPokemonToBox, removePokemonFromBox, emptyPokemon,
} from '@/lib/storage';
import { parsePokepaste } from '@/lib/pokepaste';
import { PCBox, BoxPokemon, PokemonEntry, StatName, STAT_ORDER, STAT_LABELS, NatureName } from '@/types';
import { cn } from '@/lib/utils';
import { Plus, Trash2, X, Check, Sparkles, ClipboardPaste, AlertTriangle } from 'lucide-react';

// Pure function — sprites are keyed by numeric ID, not slug
function spriteUrl(id: number, shiny = false): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shiny ? 'shiny/' : ''}${id}.png`;
}

// Hide the img on error rather than showing a broken icon
function handleImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  (e.target as HTMLImageElement).style.display = 'none';
}

export default function PCBoxPage() {
  const [boxes, setBoxes]             = useState<PCBox[]>([]);
  const [activeBoxId, setActiveBoxId] = useState<string>('');
  const [selectedSlot, setSlot]       = useState<number | null>(null);
  const [editing, setEditing]         = useState<BoxPokemon | null>(null);
  const [editPokemon, setEditPokemon] = useState<PokemonEntry | null>(null);
  const [renamingBox, setRenamingBox] = useState<string | null>(null);
  const [renameVal, setRenameVal]     = useState('');

  // Pokepaste import
  const [importOpen, setImportOpen]   = useState(false);
  const [pasteText, setPasteText]     = useState('');
  const [importWarnings, setWarnings] = useState<string[]>([]);

  // Hydrate from localStorage
  useEffect(() => {
    const loaded = loadBoxes();
    setBoxes(loaded);
    setActiveBoxId(loaded[0]?.id ?? '');
  }, []);

  // Persist on change
  useEffect(() => {
    if (boxes.length > 0) saveBoxes(boxes);
  }, [boxes]);

  const activeBox = boxes.find(b => b.id === activeBoxId);

  // ── Box management ──────────────────────────────────────────────────────────

  function handleAddBox() {
    const updated = addBox(boxes, `Box ${boxes.length + 1}`);
    setBoxes(updated);
    setActiveBoxId(updated[updated.length - 1].id);
  }

  function handleDeleteBox(id: string) {
    const updated = deleteBox(boxes, id);
    setBoxes(updated);
    if (activeBoxId === id) setActiveBoxId(updated[0]?.id ?? '');
  }

  function commitRename() {
    if (!renamingBox) return;
    setBoxes(renameBox(boxes, renamingBox, renameVal.trim() || 'Box'));
    setRenamingBox(null);
  }

  // ── Pokepaste import ─────────────────────────────────────────────────────────

  function handleImport() {
    const { pokemon, warnings } = parsePokepaste(pasteText);
    setWarnings(warnings);
    if (!pokemon.length) return;

    // Find empty slots in the active box and fill them
    let updated = boxes;
    if (!activeBoxId) return;

    const box = updated.find(b => b.id === activeBoxId);
    if (!box) return;

    let slotIdx = 0;
    for (const p of pokemon) {
      // Advance to next empty slot
      while (slotIdx < 30 && box.slots[slotIdx] !== null) slotIdx++;
      if (slotIdx >= 30) break;

      const newPokemon: BoxPokemon = {
        ...p,
        uid: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      updated = addPokemonToBox(updated, activeBoxId, slotIdx, newPokemon);
      slotIdx++;
    }

    setBoxes(updated);
    if (!warnings.length) {
      setImportOpen(false);
      setPasteText('');
    }
  }

  // ── Slot interactions ───────────────────────────────────────────────────────

  function handleSlotClick(slot: number) {
    if (!activeBox) return;
    const existing = activeBox.slots[slot];
    if (existing) {
      setSlot(slot);
      setEditing({ ...existing });
      setEditPokemon(findPokemon(existing.species) ?? null);
    } else {
      setSlot(slot);
      setEditing(emptyPokemon());
      setEditPokemon(null);
    }
  }

  function handleSave() {
    if (!editing || selectedSlot === null || !activeBoxId) return;
    setBoxes(addPokemonToBox(boxes, activeBoxId, selectedSlot, editing));
    setSlot(null);
    setEditing(null);
  }

  function handleRemove() {
    if (selectedSlot === null || !activeBoxId) return;
    setBoxes(removePokemonFromBox(boxes, activeBoxId, selectedSlot));
    setSlot(null);
    setEditing(null);
  }

  function updateEditing<K extends keyof BoxPokemon>(key: K, value: BoxPokemon[K]) {
    setEditing(prev => prev ? { ...prev, [key]: value } : prev);
  }

  function updateIV(stat: StatName, val: string) {
    const n = Math.min(31, Math.max(0, parseInt(val) || 0));
    setEditing(prev => prev ? { ...prev, ivs: { ...prev.ivs, [stat]: n } } : prev);
  }

  function handlePokemonSelect(p: PokemonEntry | null) {
    setEditPokemon(p);
    if (p) updateEditing('species', p.name);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">PC Box</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your Pokemon collection. Data is saved locally in your browser.
          </p>
        </div>
        <Button variant="outline" onClick={() => { setImportOpen(true); setWarnings([]); }}>
          <ClipboardPaste className="h-4 w-4 mr-2" />
          Import Pokepaste
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Box panel ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Box tabs */}
          <div className="flex flex-wrap gap-2 items-center">
            {boxes.map(box => (
              <div key={box.id} className="flex items-center gap-1">
                {renamingBox === box.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      autoFocus
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setRenamingBox(null);
                      }}
                      className="h-8 w-28 text-sm"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={commitRename}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setRenamingBox(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setActiveBoxId(box.id); setSlot(null); setEditing(null); }}
                    onDoubleClick={() => { setRenamingBox(box.id); setRenameVal(box.name); }}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors border',
                      box.id === activeBoxId
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent',
                    )}
                  >
                    {box.name}
                    <span className="ml-1.5 text-xs opacity-60">
                      {box.slots.filter(Boolean).length}/30
                    </span>
                  </button>
                )}
                {boxes.length > 1 && (
                  <button
                    onClick={() => handleDeleteBox(box.id)}
                    className="text-destructive opacity-0 hover:opacity-100 transition-opacity p-1 rounded"
                    title="Delete box"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleAddBox} className="h-8">
              <Plus className="h-3 w-3 mr-1" /> Add Box
            </Button>
          </div>

          {/* Box grid */}
          {activeBox && (
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-6 gap-1.5">
                  {activeBox.slots.map((slot, i) => {
                    const poke = slot ? findPokemon(slot.species) : null;
                    const isSelected = selectedSlot === i;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSlotClick(i)}
                        className={cn(
                          'aspect-square rounded-md border flex flex-col items-center justify-center transition-all relative overflow-hidden',
                          slot
                            ? 'border-border bg-card hover:border-primary/70'
                            : 'border-dashed border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-border',
                          isSelected && 'ring-2 ring-primary border-primary',
                        )}
                        title={slot ? `${slot.nickname || slot.species} — ${slot.nature}` : 'Empty slot'}
                      >
                        {slot ? (
                          <>
                            {poke && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={spriteUrl(poke.id, slot.shiny)}
                                alt={slot.species}
                                width={40}
                                height={40}
                                className="pixelated"
                                onError={handleImgError}
                              />
                            )}
                            {slot.shiny && (
                              <Sparkles className="absolute top-0.5 right-0.5 h-3 w-3 text-yellow-400" />
                            )}
                            <span className="text-[9px] text-center text-muted-foreground leading-tight px-0.5 truncate w-full">
                              {slot.nickname || slot.species}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">{i + 1}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  Double-click a box tab to rename it
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Editor panel ── */}
        <div className="lg:col-span-1">
          {editing ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  {activeBox?.slots[selectedSlot!] ? 'Edit Pokemon' : 'Add Pokemon'}
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => { setSlot(null); setEditing(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Species + sprite */}
                <div className="flex items-start gap-3">
                  {editPokemon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={spriteUrl(editPokemon.id, editing?.shiny ?? false)}
                      alt={editPokemon.name}
                      width={72}
                      height={72}
                      className="pixelated shrink-0"
                      onError={handleImgError}
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs">Species</Label>
                    <PokemonSearch value={editPokemon} onChange={handlePokemonSelect} />
                    {editPokemon && (
                      <div className="flex gap-1 flex-wrap">
                        {editPokemon.types.map(t => (
                          <Badge key={t} className={cn('text-white text-[10px]', TYPE_COLORS[t] ?? 'bg-zinc-500')}>
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Nickname + level */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nickname</Label>
                    <Input
                      className="h-8 text-sm"
                      value={editing.nickname}
                      onChange={e => updateEditing('nickname', e.target.value)}
                      placeholder={editing.species || 'Nickname'}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Level</Label>
                    <Input
                      className="h-8 text-sm" type="number" min={1} max={100}
                      value={editing.level}
                      onChange={e => updateEditing('level', Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                    />
                  </div>
                </div>

                {/* Nature + gender */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nature</Label>
                    <Select value={editing.nature} onValueChange={v => updateEditing('nature', v as NatureName)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {NATURES.map(n => (
                          <SelectItem key={n.name} value={n.name}>{n.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Gender</Label>
                    <Select value={editing.gender} onValueChange={v => updateEditing('gender', v as 'M' | 'F' | '?')}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male ♂</SelectItem>
                        <SelectItem value="F">Female ♀</SelectItem>
                        <SelectItem value="?">Genderless</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Shiny */}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.shiny}
                    onChange={e => updateEditing('shiny', e.target.checked)}
                    className="rounded"
                  />
                  <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                  Shiny
                </label>

                {/* IVs */}
                <div className="space-y-1">
                  <Label className="text-xs">IVs</Label>
                  <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
                    {STAT_ORDER.map(stat => (
                      <Fragment key={stat}>
                        <span className="text-xs text-muted-foreground text-right">{STAT_LABELS[stat]}</span>
                        <Input
                          type="number" min={0} max={31}
                          className="h-7 text-xs"
                          value={editing.ivs[stat]}
                          onChange={e => updateIV(stat, e.target.value)}
                        />
                      </Fragment>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Input
                    className="h-8 text-sm"
                    value={editing.notes}
                    onChange={e => updateEditing('notes', e.target.value)}
                    placeholder="e.g. breeding stock, has egg moves…"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button className="flex-1" onClick={handleSave}>Save</Button>
                  {activeBox?.slots[selectedSlot!] && (
                    <Button variant="destructive" size="icon" onClick={handleRemove}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                Click any slot to add or edit a Pokemon.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Pokepaste import dialog ── */}
      <Dialog open={importOpen} onOpenChange={open => { setImportOpen(open); if (!open) { setPasteText(''); setWarnings([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import from Pokepaste</DialogTitle>
            <DialogDescription>
              Paste one or more Pokemon in Showdown / Pokepaste format. They will be added to the
              active box starting from the first empty slot.
            </DialogDescription>
          </DialogHeader>

          <textarea
            className="w-full h-56 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder={`Garchomp @ Choice Scarf\nAbility: Rough Skin\nLevel: 50\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\nIVs: 0 SpA\n- Earthquake\n- Outrage\n- Dragon Claw\n- Stealth Rock`}
            value={pasteText}
            onChange={e => { setPasteText(e.target.value); setWarnings([]); }}
          />

          {importWarnings.length > 0 && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 space-y-1">
              <div className="flex items-center gap-2 text-yellow-400 text-xs font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                {importWarnings.length} warning{importWarnings.length > 1 ? 's' : ''}
              </div>
              {importWarnings.map((w, i) => (
                <p key={i} className="text-xs text-muted-foreground">{w}</p>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!pasteText.trim()}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
