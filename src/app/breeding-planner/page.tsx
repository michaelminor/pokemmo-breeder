'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import PokemonSearch from '@/components/PokemonSearch';
import { generateBreedingPlan, getSuggestedIVs } from '@/lib/breeding';
import { PokemonEntry, StatName, STAT_ORDER, STAT_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronRight, CheckCircle2, Circle } from 'lucide-react';

type RolePreset = 'physical' | 'special' | 'mixed' | 'support' | 'custom';

export default function BreedingPlannerPage() {
  const [pokemon, setPokemon]     = useState<PokemonEntry | null>(null);
  const [selectedIVs, setSelIVs]  = useState<Set<StatName>>(new Set());
  const [preset, setPreset]       = useState<RolePreset>('custom');

  function applyPreset(role: RolePreset) {
    setPreset(role);
    if (role !== 'custom') {
      setSelIVs(new Set(getSuggestedIVs(role as Exclude<RolePreset, 'custom'>)));
    }
  }

  function toggleIV(stat: StatName) {
    setPreset('custom');
    setSelIVs(prev => {
      const next = new Set(prev);
      next.has(stat) ? next.delete(stat) : next.add(stat);
      return next;
    });
  }

  const targetIVs = STAT_ORDER.filter(s => selectedIVs.has(s));

  const plan = useMemo(() => {
    if (!pokemon || targetIVs.length === 0) return null;
    return generateBreedingPlan(pokemon.name, targetIVs);
  }, [pokemon, targetIVs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Breeding Chain Planner</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select your target Pokemon and desired perfect IVs to get a step-by-step breeding plan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ── Inputs ── */}
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-base">Target</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Pokemon</Label>
              <PokemonSearch value={pokemon} onChange={setPokemon} />
            </div>

            <div className="space-y-2">
              <Label>Role preset</Label>
              <Select value={preset} onValueChange={v => applyPreset(v as RolePreset)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="physical">Physical Attacker</SelectItem>
                  <SelectItem value="special">Special Attacker</SelectItem>
                  <SelectItem value="mixed">Mixed Attacker</SelectItem>
                  <SelectItem value="support">Support / Wall</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Perfect IVs to target</Label>
              <div className="grid grid-cols-2 gap-2">
                {STAT_ORDER.map(stat => {
                  const selected = selectedIVs.has(stat);
                  return (
                    <button
                      key={stat}
                      onClick={() => toggleIV(stat)}
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                        selected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                      )}
                    >
                      {selected
                        ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                        : <Circle className="h-4 w-4 shrink-0" />
                      }
                      {STAT_LABELS[stat]}
                    </button>
                  );
                })}
              </div>
            </div>

            {targetIVs.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Targeting <strong className="text-foreground">{targetIVs.length} perfect IV{targetIVs.length > 1 ? 's' : ''}</strong>:{' '}
                {targetIVs.map(s => STAT_LABELS[s]).join(', ')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Plan output ── */}
        <div className="md:col-span-2 space-y-4">
          {!pokemon && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select a Pokemon and target IVs to generate a breeding plan.
              </CardContent>
            </Card>
          )}

          {pokemon && targetIVs.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select at least one IV to target.
              </CardContent>
            </Card>
          )}

          {plan && (
            <>
              {/* Summary */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Target</p>
                      <p className="font-semibold">{plan.targetPokemon}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">IVs to breed</p>
                      <p className="font-semibold">{plan.targetIVs.map(s => s.toUpperCase()).join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Breeding steps</p>
                      <p className="font-semibold">{plan.steps.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Expected eggs</p>
                      <p className="font-semibold">~{plan.totalExpectedEggs}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Est. cost</p>
                      <p className="font-semibold">{plan.estimatedCost}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Steps */}
              {plan.steps.map(step => (
                <Card key={step.stepNumber}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge variant="outline">Step {step.stepNumber}</Badge>
                      Breed to get {step.offspring.neededIVs.map(s => STAT_LABELS[s as StatName]).join(' + ')} IVs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Parent 1 */}
                      <BreedingParentCard
                        label={step.parent1.label}
                        ivs={step.parent1.passIVs}
                        heldItem={step.parent1.heldItem}
                      />

                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />

                      {/* Parent 2 */}
                      <BreedingParentCard
                        label={step.parent2.label}
                        ivs={step.parent2.passIVs}
                        heldItem={step.parent2.heldItem}
                      />

                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />

                      {/* Offspring */}
                      <BreedingParentCard
                        label={step.offspring.label}
                        ivs={step.offspring.neededIVs}
                        heldItem={null}
                        isResult
                      />
                    </div>

                    <p className="text-xs text-muted-foreground mt-3">{step.notes}</p>

                    <div className="mt-2 text-xs text-muted-foreground">
                      Expected: ~{step.offspring.expectedEggs} egg{step.offspring.expectedEggs > 1 ? 's' : ''}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Tips */}
              <Card className="border-dashed">
                <CardContent className="py-4 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">PokeMMO Breeding Tips</p>
                  <p>• <strong>Destiny Knot</strong> — passes 5 of the 12 combined IVs to the offspring (random pick each egg).</p>
                  <p>• <strong>Power Items</strong> — guarantee a specific IV is always passed, regardless of Destiny Knot.</p>
                  <p>• <strong>Everstone</strong> — 100% chance to pass the holder&apos;s nature.</p>
                  <p>• Start each chain by buying parents with a single perfect IV from the GTS or breeding with Ditto.</p>
                  <p>• Cost estimate assumes market-rate parents. IV-breeding your own base parents reduces cost significantly.</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BreedingParentCard({
  label,
  ivs,
  heldItem,
  isResult = false,
}: {
  label: string;
  ivs: StatName[];
  heldItem: string | null;
  isResult?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-lg border p-3 min-w-[140px] flex-1 space-y-2 text-sm',
      isResult ? 'border-primary/50 bg-primary/5' : 'border-border bg-card',
    )}>
      <p className="font-medium text-xs leading-tight">{label}</p>
      <div className="flex flex-wrap gap-1">
        {ivs.map(s => (
          <Badge key={s} variant="secondary" className="text-[10px] px-1.5">
            31 {STAT_LABELS[s as StatName]}
          </Badge>
        ))}
      </div>
      {heldItem && (
        <p className="text-[10px] text-muted-foreground">Holds: {heldItem}</p>
      )}
    </div>
  );
}
