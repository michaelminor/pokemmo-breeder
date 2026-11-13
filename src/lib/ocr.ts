import { NatureName, StatName } from '@/types';
import { NATURES } from '@/data/natures';
import { searchPokemon } from './pokemon';

export interface ParsedScreenshot {
  pokemonName: string;
  level: number;
  nature: NatureName | null;
  /** IV values (0–31), parsed directly from the PokeMMO IV summary tab */
  hp:  number | null;
  atk: number | null;
  def: number | null;
  spa: number | null;
  spd: number | null;
  spe: number | null;
  /** Parsed from the "Total: X / 186" line — used as a cross-check */
  ivTotal: number | null;
  rawText: string;
  confidence: 'high' | 'medium' | 'low';
}

// ── Image pre-processing ─────────────────────────────────────────────────────

/**
 * Upscale and boost contrast on a game screenshot before feeding to Tesseract.
 * Returns a blob with the processed image.
 */
export async function preprocessImage(file: File): Promise<Blob> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const scale  = 2;
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth  * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext('2d')!;

      // Upscale
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Boost contrast + convert to greyscale via pixel manipulation
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < d.data.length; i += 4) {
        // Greyscale
        const grey = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
        // Stretch contrast: push values toward 0 or 255
        const contrast = 1.6;
        const shifted  = ((grey - 128) * contrast + 128);
        const clamped  = Math.max(0, Math.min(255, shifted));
        d.data[i] = d.data[i + 1] = d.data[i + 2] = clamped;
      }
      ctx.putImageData(d, 0, 0);

      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve(blob!), 'image/png');
    };

    img.src = url;
  });
}

// ── OCR runner ───────────────────────────────────────────────────────────────

export type OcrProgressCallback = (pct: number, status: string) => void;

/**
 * Run Tesseract OCR on a file (or pre-processed blob).
 * Dynamically imports Tesseract to keep it out of the initial bundle.
 */
export async function runOCR(
  image: File | Blob,
  onProgress?: OcrProgressCallback,
): Promise<string> {
  // Dynamic import keeps the ~2 MB Tesseract bundle off the initial page load
  const { createWorker } = await import('tesseract.js');

  onProgress?.(0, 'Initialising OCR engine…');

  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        onProgress?.(Math.round(m.progress * 100), 'Reading text…');
      } else if (m.status === 'loading tesseract core') {
        onProgress?.(5, 'Loading OCR engine…');
      } else if (m.status === 'initializing tesseract') {
        onProgress?.(10, 'Initialising…');
      } else if (m.status === 'loading language traineddata') {
        onProgress?.(20, 'Loading English language data…');
      } else if (m.status === 'initializing api') {
        onProgress?.(30, 'Starting up…');
      }
    },
  });

  // PSM 6 = single uniform block — works well for game stat screens
  await worker.setParameters({ tessedit_pageseg_mode: '6' } as Record<string, string>);

  const { data: { text } } = await worker.recognize(image);
  await worker.terminate();
  return text;
}

// ── Text parser ──────────────────────────────────────────────────────────────

const NATURE_NAMES = NATURES.map(n => n.name);

/** Try multiple regex patterns against text; return the first match as an int */
function firstIntMatch(text: string, ...patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const val = parseInt(m[1] ?? m[2]);
      if (!isNaN(val)) return val;
    }
  }
  return null;
}

/**
 * Parse raw OCR text from a PokeMMO (Gen 5 style) Pokemon summary screen.
 *
 * The screen shows:
 *   - Pokemon name (usually the first or second line)
 *   - "Lv. 50" or "Lv50" somewhere near the top
 *   - HP  250/250   (current / max)
 *   - Attack  152
 *   - Defense  103
 *   - Sp. Atk  75
 *   - Sp. Def  105
 *   - Speed  163
 *   - "[Nature] Nature" or just the nature name
 */
export function parseOCRText(raw: string): ParsedScreenshot {
  const text = raw.replace(/\r\n/g, '\n');

  // ── Level ─────────────────────────────────────────────────────────────────
  const level = firstIntMatch(
    text,
    /(?:Lv\.?|Level)\s*:?\s*(\d{1,3})/i,
    /\bLV\.?\s*(\d{1,3})\b/i,
  ) ?? 50;

  // ── Nature ────────────────────────────────────────────────────────────────
  const natureRe = new RegExp(`\\b(${NATURE_NAMES.join('|')})\\b`, 'i');
  const natureHit = text.match(natureRe);
  const nature = natureHit
    ? (NATURE_NAMES.find(n => n.toLowerCase() === natureHit[1].toLowerCase()) as NatureName ?? null)
    : null;

  // ── HP ────────────────────────────────────────────────────────────────────
  // PokeMMO shows "HP  250/250" — we want max HP (second number)
  const hpMatch = text.match(/\bHP\s*:?\s*(\d+)\s*(?:\/\s*(\d+))?/i);
  const hp = hpMatch
    ? parseInt(hpMatch[2] ?? hpMatch[1])   // prefer max if slash present
    : null;

  // ── Other stats ───────────────────────────────────────────────────────────
  const atk = firstIntMatch(
    text,
    /\bAttack\s*:?\s*(\d+)/i,
    /\bAtk\s*:?\s*(\d+)/i,
  );
  const def = firstIntMatch(
    text,
    /\bDefense\s*:?\s*(\d+)/i,
    /\bDefence\s*:?\s*(\d+)/i,
    /\bDef\s*:?\s*(\d+)/i,
  );
  const spa = firstIntMatch(
    text,
    /Sp\.?\s*Atk\s*:?\s*(\d+)/i,
    /Special\s*Attack\s*:?\s*(\d+)/i,
  );
  const spd = firstIntMatch(
    text,
    /Sp\.?\s*Def\s*:?\s*(\d+)/i,
    /Special\s*Def(?:ense|ence)\s*:?\s*(\d+)/i,
  );
  const spe = firstIntMatch(
    text,
    /\bSpeed\s*:?\s*(\d+)/i,
    /\bSpd\s*:?\s*(\d+)/i,
  );

  // ── Pokemon name ──────────────────────────────────────────────────────────
  // Heuristic: scan non-numeric lines and try to match our database
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let pokemonName = '';
  for (const line of lines.slice(0, 6)) {
    const cleaned = line.replace(/[^A-Za-z .'-]/g, '').trim();
    if (!cleaned || cleaned.length < 3) continue;
    const results = searchPokemon(cleaned, 1);
    if (results.length && results[0].name.toLowerCase() === cleaned.toLowerCase()) {
      pokemonName = results[0].name;
      break;
    }
    // Fuzzy: if first word matches a known Pokemon
    const firstWord = cleaned.split(/\s+/)[0];
    const fuzzy = searchPokemon(firstWord, 1);
    if (fuzzy.length) {
      pokemonName = fuzzy[0].name;
      break;
    }
  }
  if (!pokemonName) pokemonName = lines[0]?.replace(/[^A-Za-z '-]/g, '').trim() ?? '';

  // ── Confidence ────────────────────────────────────────────────────────────
  const found = [hp, atk, def, spa, spd, spe].filter(v => v !== null).length;
  const confidence: ParsedScreenshot['confidence'] =
    found === 6 ? 'high' : found >= 3 ? 'medium' : 'low';

  return { pokemonName, level, nature, hp, atk, def, spa, spd, spe, rawText: raw, confidence };
}
