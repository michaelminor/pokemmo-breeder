'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import PokemonSearch from '@/components/PokemonSearch';
import { NATURES } from '@/data/natures';
import { findPokemon } from '@/lib/pokemon';
import { preprocessImage, runOCR, parseOCRText, ParsedScreenshot } from '@/lib/ocr';
import { PokemonEntry, NatureName, StatName, STAT_ORDER, STAT_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import {
  Upload, ImageIcon, CheckCircle2, AlertTriangle,
  Calculator, Box, ChevronDown, ChevronUp, RotateCcw,
} from 'lucide-react';

type Status = 'idle' | 'preprocessing' | 'ocr' | 'done' | 'error';

const CONFIDENCE_CONFIG = {
  high:   { label: 'High confidence',   color: 'text-emerald-400', icon: CheckCircle2 },
  medium: { label: 'Medium confidence', color: 'text-yellow-400',  icon: AlertTriangle },
  low:    { label: 'Low confidence',    color: 'text-red-400',     icon: AlertTriangle },
};

export default function ScreenshotImportPage() {
  const router = useRouter();

  const [status, setStatus]       = useState<Status>('idle');
  const [progress, setProgress]   = useState(0);
  const [progressMsg, setProgMsg] = useState('');
  const [imageUrl, setImageUrl]   = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [showRaw, setShowRaw]     = useState(false);

  // Editable parsed result
  const [parsed, setParsed]           = useState<ParsedScreenshot | null>(null);
  const [editPokemon, setEditPokemon] = useState<PokemonEntry | null>(null);
  const [editLevel, setEditLevel]     = useState(50);
  const [editNature, setEditNature]   = useState<NatureName>('Hardy');
  const [editStats, setEditStats]     = useState<Record<StatName, string>>({
    hp: '', atk: '', def: '', spa: '', spd: '', spe: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef      = useRef<HTMLDivElement>(null);

  // ── File handling ─────────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please drop an image file (.png, .jpg, etc.)');
      return;
    }

    setError(null);
    const preview = URL.createObjectURL(file);
    setImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return preview; });

    try {
      setStatus('preprocessing');
      setProgress(5);
      setProgMsg('Pre-processing image…');
      const processed = await preprocessImage(file);

      setStatus('ocr');
      const rawText = await runOCR(processed, (pct, msg) => {
        setProgress(30 + Math.round(pct * 0.7));
        setProgMsg(msg);
      });

      const result = parseOCRText(rawText);
      setParsed(result);

      // Populate editable fields
      const poke = findPokemon(result.pokemonName);
      setEditPokemon(poke ?? null);
      setEditLevel(result.level ?? 50);
      setEditNature(result.nature ?? 'Hardy');
      setEditStats({
        hp:  String(result.hp  ?? ''),
        atk: String(result.atk ?? ''),
        def: String(result.def ?? ''),
        spa: String(result.spa ?? ''),
        spd: String(result.spd ?? ''),
        spe: String(result.spe ?? ''),
      });

      setStatus('done');
      setProgress(100);
    } catch (err) {
      console.error(err);
      setError('OCR failed. Try a clearer screenshot.');
      setStatus('error');
    }
  }, []);

  // Global paste handler — works anywhere on the page (Ctrl+V / Cmd+V)
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (!e.clipboardData) return;
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) processFile(file);
          break;
        }
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFile]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  function handleReset() {
    setStatus('idle');
    setParsed(null);
    setProgress(0);
    setError(null);
    if (imageUrl) { URL.revokeObjectURL(imageUrl); setImageUrl(null); }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function openInIVCalc() {
    const params = new URLSearchParams({
      pokemon: editPokemon?.slug ?? '',
      level:   String(editLevel),
      nature:  editNature,
      hp:  editStats.hp,
      atk: editStats.atk,
      def: editStats.def,
      spa: editStats.spa,
      spd: editStats.spd,
      spe: editStats.spe,
    });
    router.push(`/iv-calculator?${params.toString()}`);
  }

  function addToPCBox() {
    // Store in sessionStorage for the PC Box page to pick up
    const data = {
      species: editPokemon?.name ?? '',
      level:   editLevel,
      nature:  editNature,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, // IVs unknown from stats alone
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: ['', '', '', ''],
      shiny: false,
      gender: '?' as const,
      notes: 'Imported from screenshot',
    };
    sessionStorage.setItem('pokemmo_pending_import', JSON.stringify(data));
    router.push('/pc-box');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isProcessing = status === 'preprocessing' || status === 'ocr';
  const isDone       = status === 'done';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Screenshot Import</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Drop a PokeMMO Pokemon summary screen screenshot — OCR runs locally in your browser, nothing is uploaded.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: drop zone + image preview ── */}
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onDragEnter={e => { e.preventDefault(); dropRef.current?.classList.add('border-primary'); }}
            onDragLeave={() => dropRef.current?.classList.remove('border-primary')}
            onClick={() => status === 'idle' || status === 'error' ? fileInputRef.current?.click() : null}
            className={cn(
              'rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-3 text-center p-8',
              (status === 'idle' || status === 'error')
                ? 'border-border hover:border-primary/60 cursor-pointer hover:bg-accent/30'
                : 'border-border/40 cursor-default',
              imageUrl ? 'min-h-[120px]' : 'min-h-[220px]',
            )}
          >
            {!imageUrl ? (
              <>
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="space-y-1 text-center">
                  <p className="font-medium">Drop, paste, or click to import</p>
                  <p className="text-sm text-muted-foreground">
                    Take a screenshot in-game, then press{' '}
                    <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-xs font-mono">
                      Ctrl+V
                    </kbd>
                    {' '}anywhere on this page
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WebP · Works best with the Pokemon summary screen (Stats tab)
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                {isDone ? 'Drop a new screenshot to start over' : 'Processing…'}
              </p>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
          />

          {/* Image preview */}
          {imageUrl && (
            <div className="rounded-lg border border-border overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Screenshot preview" className="w-full object-contain max-h-72" />
            </div>
          )}

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{progressMsg}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* ── Right: parsed results ── */}
        <div>
          {!parsed && !isProcessing && (
            <Card className="border-dashed h-full">
              <CardContent className="flex items-center justify-center h-full min-h-[220px] text-muted-foreground text-sm">
                Parsed data will appear here after OCR.
              </CardContent>
            </Card>
          )}

          {isProcessing && (
            <Card className="h-full">
              <CardContent className="flex flex-col items-center justify-center h-full min-h-[220px] gap-4 text-muted-foreground">
                <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm">{progressMsg || 'Processing…'}</p>
              </CardContent>
            </Card>
          )}

          {isDone && parsed && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Parsed Result</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const cfg = CONFIDENCE_CONFIG[parsed.confidence];
                      return (
                        <span className={cn('flex items-center gap-1 text-xs font-normal', cfg.color)}>
                          <cfg.icon className="h-3.5 w-3.5" />
                          {cfg.label}
                        </span>
                      );
                    })()}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset} title="Start over">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pokemon + sprite */}
                <div className="flex items-center gap-3">
                  {editPokemon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${editPokemon.id}.png`}
                      alt={editPokemon.name}
                      width={56}
                      height={56}
                      className="pixelated shrink-0"
                    />
                  )}
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Pokemon</Label>
                    <PokemonSearch value={editPokemon} onChange={p => setEditPokemon(p)} />
                  </div>
                </div>

                {/* Level + Nature */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Level</Label>
                    <Input
                      type="number" min={1} max={100}
                      className="h-8 text-sm"
                      value={editLevel}
                      onChange={e => setEditLevel(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Nature
                      {!parsed.nature && (
                        <Badge variant="outline" className="ml-2 text-[10px] text-yellow-400 border-yellow-400/40">
                          not detected
                        </Badge>
                      )}
                    </Label>
                    <Select value={editNature} onValueChange={v => setEditNature(v as NatureName)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {NATURES.map(n => <SelectItem key={n.name} value={n.name}>{n.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-1">
                  <Label className="text-xs">Stat values <span className="text-muted-foreground">(correct any OCR errors)</span></Label>
                  <div className="grid grid-cols-3 gap-2">
                    {STAT_ORDER.map(stat => (
                      <div key={stat} className="space-y-0.5">
                        <p className={cn('text-[10px] font-medium',
                          editStats[stat] ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {STAT_LABELS[stat]}
                          {!editStats[stat] && <span className="ml-1 text-yellow-500">?</span>}
                        </p>
                        <Input
                          type="number" min={1} max={999}
                          className="h-7 text-xs"
                          value={editStats[stat]}
                          onChange={e => setEditStats(prev => ({ ...prev, [stat]: e.target.value }))}
                          placeholder="–"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button onClick={openInIVCalc} className="gap-2" disabled={!editPokemon}>
                    <Calculator className="h-4 w-4" />
                    IV Calculator
                  </Button>
                  <Button variant="outline" onClick={addToPCBox} className="gap-2" disabled={!editPokemon}>
                    <Box className="h-4 w-4" />
                    Add to PC Box
                  </Button>
                </div>

                {/* Raw OCR toggle */}
                <button
                  onClick={() => setShowRaw(v => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showRaw ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showRaw ? 'Hide' : 'Show'} raw OCR text
                </button>
                {showRaw && (
                  <pre className="text-[10px] font-mono bg-muted/50 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap">
                    {parsed.rawText}
                  </pre>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Tips */}
      <Card className="border-dashed">
        <CardContent className="py-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Tips for better OCR accuracy</p>
          <p>• Use the <strong>Stats tab</strong> of the Pokemon summary screen (shows HP/Atk/Def/Sp.Atk/Sp.Def/Speed values).</p>
          <p>• Take the screenshot at <strong>native resolution</strong> — avoid compressed or scaled-down images.</p>
          <p>• The <strong>default PokeMMO theme</strong> works best. Custom high-contrast themes also work well.</p>
          <p>• All OCR fields are <strong>editable</strong> — correct any misreads before sending to the IV Calculator.</p>
          <p>• OCR runs <strong>entirely in your browser</strong>. No image data leaves your machine.</p>
        </CardContent>
      </Card>
    </div>
  );
}
