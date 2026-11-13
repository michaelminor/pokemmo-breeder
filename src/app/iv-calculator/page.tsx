'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import PokemonSearch from '@/components/PokemonSearch';
import { NATURES, NATURE_MAP } from '@/data/natures';
import { calcAllIVRanges, ivRangeLabel, ivQuality } from '@/lib/iv-calc';
import { TYPE_COLORS, statBarWidth, findPokemon } from '@/lib/pokemon';
import { Fragment } from 'react';
import { PokemonEntry, StatName, NatureData, BaseStats, STAT_ORDER, STAT_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

const EMPTY_STATS: BaseStats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

const QUALITY_COLORS: Record<string, string> = {
  perfect: 'bg-emerald-500',
  great:   'bg-blue-500',
  good:    'bg-yellow-500',
  poor:    'bg-red-500',
  unknown: 'bg-zinc-500',
};

// Inner component reads URL params — must be wrapped in Suspense
function IVCalculatorInner() {
  const searchParams = useSearchParams();
  const [pokemon, setPokemon]   = useState<PokemonEntry | null>(null);
  const [level, setLevel]       = useState(50);
  const [nature, setNature]     = useState<NatureData>(NATURES[0]);
  const [stats, setStats]       = useState<BaseStats>(EMPTY_STATS);
  const [evs, setEvs]           = useState<BaseStats>(EMPTY_STATS);

  // Pre-fill from OCR import URL params (?pokemon=garchomp&level=50&nature=Jolly&hp=250…)
  useEffect(() => {
    const slug    = searchParams.get('pokemon');
    const lvl     = searchParams.get('level');
    const nat     = searchParams.get('nature');
    const statMap = { hp: 'hp', atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe' } as const;

    if (slug) {
      const p = findPokemon(slug);
      if (p) setPokemon(p);
    }
    if (lvl) setLevel(Math.min(100, Math.max(1, parseInt(lvl) || 50)));
    if (nat) {
      const n = NATURE_MAP.get(nat as NatureData['name']);
      if (n) setNature(n);
    }

    const incoming: Partial<BaseStats> = {};
    for (const [key, statKey] of Object.entries(statMap)) {
      const v = searchParams.get(key);
      if (v) incoming[statKey] = parseInt(v) || 0;
    }
    if (Object.keys(incoming).length) {
      setStats(prev => ({ ...prev, ...incoming }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ivResult = useMemo(() => {
    if (!pokemon || level < 1 || level > 100) return null;
    return calcAllIVRanges(pokemon.baseStats, stats, evs, level, nature);
  }, [pokemon, level, nature, stats, evs]);

  function setStatVal(stat: StatName, val: string) {
    setStats(prev => ({ ...prev, [stat]: parseInt(val) || 0 }));
  }
  function setEvVal(stat: StatName, val: string) {
    const n = Math.min(255, Math.max(0, parseInt(val) || 0));
    setEvs(prev => ({ ...prev, [stat]: n }));
  }

  const spriteUrl = pokemon
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">IV Calculator</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Enter your Pokemon&apos;s stats to determine its Individual Values.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ── Pokemon selector ── */}
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-base">Pokemon</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <PokemonSearch value={pokemon} onChange={setPokemon} />

            {pokemon && (
              <div className="flex flex-col items-center gap-2 pt-2">
                {spriteUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={spriteUrl} alt={pokemon.name} width={96} height={96} className="pixelated" />
                )}
                <p className="font-semibold">{pokemon.name}</p>
                <p className="text-xs text-muted-foreground">#{String(pokemon.id).padStart(3, '0')}</p>
                <div className="flex gap-1 flex-wrap justify-center">
                  {pokemon.types.map(t => (
                    <Badge key={t} className={cn('text-white', TYPE_COLORS[t] ?? 'bg-zinc-500')}>
                      {t}
                    </Badge>
                  ))}
                </div>
                {/* Base stats mini-bars */}
                <div className="w-full space-y-1 mt-2">
                  {STAT_ORDER.map(stat => (
                    <div key={stat} className="flex items-center gap-2 text-xs">
                      <span className="w-12 text-right text-muted-foreground">{STAT_LABELS[stat]}</span>
                      <span className="w-6 text-right font-mono">{pokemon.baseStats[stat]}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${statBarWidth(pokemon.baseStats[stat])}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Level</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={level}
                onChange={e => setLevel(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              />
            </div>

            <div className="space-y-2">
              <Label>Nature</Label>
              <Select value={nature.name} onValueChange={v => setNature(NATURES.find(n => n.name === v)!)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NATURES.map(n => (
                    <SelectItem key={n.name} value={n.name}>
                      {n.name}
                      {n.increased && ` (+${n.increased.toUpperCase()})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Stat inputs ── */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Stats & EVs
              <Tooltip>
                <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                <TooltipContent>
                  Enter the stats shown on your Pokemon&apos;s summary screen.
                  EVs are optional but improve accuracy.
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-x-3 gap-y-3 items-center">
              <span className="text-xs text-muted-foreground font-medium">Stat</span>
              <span className="text-xs text-muted-foreground font-medium">Value</span>
              <span className="text-xs text-muted-foreground font-medium">EVs</span>
              <span className="text-xs text-muted-foreground font-medium">IVs</span>

              {STAT_ORDER.map(stat => {
                const quality = ivResult ? ivQuality(ivResult[stat]) : null;
                const label   = ivResult ? ivRangeLabel(ivResult[stat]) : '–';
                const isNatureUp   = nature.increased === stat;
                const isNatureDown = nature.decreased === stat;

                return (
                  <Fragment key={stat}>
                    <Label className={cn(
                      'text-sm font-medium whitespace-nowrap',
                      isNatureUp   && 'text-blue-400',
                      isNatureDown && 'text-red-400',
                    )}>
                      {STAT_LABELS[stat]}
                      {isNatureUp   && ' ▲'}
                      {isNatureDown && ' ▼'}
                    </Label>

                    <Input
                      type="number"
                      min={1}
                      max={999}
                      className="h-8 text-sm"
                      value={stats[stat] || ''}
                      onChange={e => setStatVal(stat, e.target.value)}
                      placeholder="–"
                    />

                    <Input
                      type="number"
                      min={0}
                      max={255}
                      className="h-8 text-sm"
                      value={evs[stat] || ''}
                      onChange={e => setEvVal(stat, e.target.value)}
                      placeholder="0"
                    />

                    <div className="flex items-center gap-2">
                      {quality ? (
                        <>
                          <span
                            className={cn(
                              'inline-block w-2 h-2 rounded-full',
                              QUALITY_COLORS[quality],
                            )}
                          />
                          <span className="font-mono text-sm">{label}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-sm">–</span>
                      )}
                    </div>
                  </Fragment>
                );
              })}
            </div>

            {ivResult && (
              <div className="mt-6 p-3 rounded-md bg-muted/50 text-sm space-y-1">
                <p className="font-medium">Legend</p>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(QUALITY_COLORS).map(([q, color]) => (
                    <span key={q} className="flex items-center gap-1.5">
                      <span className={cn('inline-block w-2 h-2 rounded-full', color)} />
                      <span className="capitalize text-muted-foreground">{q}</span>
                    </span>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs pt-1">
                  A range like 28–31 means the IV could be any value in that range.
                  Level up or use vitamins/wings to narrow it down.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function IVCalculatorPage() {
  return (
    <Suspense>
      <IVCalculatorInner />
    </Suspense>
  );
}
