'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { searchPokemon, TYPE_COLORS } from '@/lib/pokemon';
import { PokemonEntry } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  value: PokemonEntry | null;
  onChange: (p: PokemonEntry | null) => void;
  placeholder?: string;
  className?: string;
}

export default function PokemonSearch({ value, onChange, placeholder, className }: Props) {
  const [query, setQuery] = useState(value?.name ?? '');
  const [results, setResults] = useState<PokemonEntry[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    setResults(searchPokemon(val));
    setOpen(true);
    if (!val) onChange(null);
  }

  function handleSelect(p: PokemonEntry) {
    onChange(p);
    setQuery(p.name);
    setOpen(false);
  }

  const spriteUrl = (id: number) =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Input
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => { setResults(searchPokemon(query)); setOpen(true); }}
        placeholder={placeholder ?? 'Search Pokemon…'}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          {results.map(p => (
            <li
              key={p.id}
              className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent"
              onMouseDown={() => handleSelect(p)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={spriteUrl(p.id)}
                alt={p.name}
                width={32}
                height={32}
                className="pixelated"
              />
              <span className="flex-1 text-sm font-medium">{p.name}</span>
              <span className="text-xs text-muted-foreground">#{String(p.id).padStart(3, '0')}</span>
              <div className="flex gap-1">
                {p.types.map(t => (
                  <Badge
                    key={t}
                    className={cn('text-white text-[10px] px-1.5 py-0', TYPE_COLORS[t] ?? 'bg-zinc-500')}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
