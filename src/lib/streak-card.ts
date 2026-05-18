/**
 * Generates a 1080×1080 square PNG of the user's habit streak — branded
 * gradient + the streak number + habit name + a rotating motivational
 * phrase. Designed for sharing on Instagram (feed), WhatsApp Status,
 * X/Twitter, etc.
 *
 * Pipeline: `buildStreakCardSvg()` (pure string) → `<img src=svgDataUrl>`
 * → draw on Canvas → `toBlob('image/png')`. Zero external deps; SVG is
 * pixel-perfect across browsers, and Canvas is universally supported
 * for the PNG conversion.
 */

const CARD_SIZE = 1080;

/**
 * Brand mark paths, copied verbatim from `public/logo/logo_lg.svg`
 * (viewBox 385.02 × 375.68). Inlined here so the streak card SVG is
 * self-contained — `<image href="...">` doesn't work reliably when
 * rasterizing SVG to canvas (CORS / "tainted canvas" issues), and
 * even if it did, fetching the logo per card would add a network round
 * trip we don't need.
 *
 * Fill comes from the parent `<g>` so we can flip the logo to white
 * (or any color) without editing this string.
 */
const BRAND_LOGO_PATHS = `<path d="M263.53,178.46h-33.91c-3.24,0-5.87,2.63-5.87,5.87v60.78c0,2.95-2.39,5.35-5.35,5.35h-51.82c-2.94,0-5.32-2.38-5.32-5.32v-60.82c0-3.24-2.63-5.87-5.87-5.87h-33.91c-3.24,0-5.87,2.63-5.87,5.87v185.48c0,3.24,2.63,5.87,5.87,5.87h33.91c3.24,0,5.87-2.63,5.87-5.87v-70.17c0-2.95,2.39-5.35,5.35-5.35h51.75c2.97,0,5.38,2.41,5.38,5.38v70.14c0,3.24,2.63,5.87,5.87,5.87h33.91c3.24,0,5.87-2.63,5.87-5.87v-185.48c0-3.24-2.63-5.87-5.87-5.87Z"/>
<path d="M1.63,120.65c21.63-21.39,43.26-42.79,64.89-64.18,4.01-3.97,10.46-4,14.51-.07,5.88,5.69,11.76,11.39,17.63,17.08,3.6,3.48,9.32,3.45,12.87-.08,22.83-22.71,45.66-45.41,68.5-68.12,7.09-7.05,18.53-7.04,25.61,0,22.76,22.65,45.51,45.31,68.27,67.96,3.44,3.42,8.99,3.47,12.48.1,5.77-5.57,11.54-11.14,17.3-16.71,4.29-4.15,11.11-4.12,15.37.06,21.21,20.83,42.43,41.65,63.64,62.48,3.19,3.13,3.07,8.3-.25,11.29-3.13,2.81-6.25,5.61-9.38,8.42-3.92,3.52-9.91,3.38-13.66-.33-13.65-13.49-27.3-26.99-40.96-40.48-3.88-3.83-10.12-3.81-13.97.04-5.48,5.48-10.96,10.96-16.43,16.43-4.32,4.32-11.31,4.32-15.64.02-23.83-23.71-47.67-47.43-71.5-71.14-4.62-4.59-12.07-4.59-16.69,0-23.89,23.8-47.78,47.59-71.67,71.39-4,3.99-10.47,4.02-14.51.06l-16.65-16.29c-4.47-4.37-11.62-4.36-16.07.04-13.85,13.68-27.69,27.35-41.54,41.03-3.1,3.06-8.1,3.03-11.16-.07-3.68-3.73-7.36-7.45-11.04-11.18-2.13-2.16-2.11-5.63.04-7.76Z"/>
<rect x="56.77" y="143.72" width="37" height="37" rx="7.87" ry="7.87"/>
<rect x="291.68" y="143.53" width="37" height="37" rx="7.87" ry="7.87"/>
<rect x="163.39" y="90.76" width="58.25" height="57.47" rx="8.24" ry="8.24" transform="translate(-28.11 171.13) rotate(-45)"/>`;

/**
 * Bucket boundaries (lower bound inclusive). Each tier exposes 3 phrases
 * for deterministic rotation via `days % 3` — the same streak number
 * always shows the same phrase, no surprises across reshares.
 */
const PHRASE_TIERS: Array<{ minDays: number; key: string }> = [
  { minDays: 365, key: 'year' },
  { minDays: 180, key: 'halfYear' },
  { minDays: 90, key: 'quarter' },
  { minDays: 60, key: 'twoMonths' },
  { minDays: 30, key: 'month' },
  { minDays: 14, key: 'twoWeeks' },
  { minDays: 7, key: 'week' },
  { minDays: 0, key: 'starting' },
];

export type StreakPhraseTier =
  | 'starting'
  | 'week'
  | 'twoWeeks'
  | 'month'
  | 'twoMonths'
  | 'quarter'
  | 'halfYear'
  | 'year';

/**
 * Picks an i18n key from `habits.streakCard.phrases.*` based on the streak
 * length. Deterministic — same `days` always yields the same key, which
 * means the same card design across reshares.
 *
 * Returns the FULL i18n key (e.g. `month1`) for use with `t()`.
 */
export function pickStreakPhraseKey(days: number): string {
  const tier = PHRASE_TIERS.find((t) => days >= t.minDays)?.key ?? 'starting';
  // 3 variants per tier — index 1..3 to match the human-readable naming
  // (`month1`, `month2`, `month3`).
  const variant = (days % 3) + 1;
  return `${tier}${variant}`;
}

interface BuildStreakCardSvgParams {
  /** Days of the current streak. */
  days: number;
  /** Habit name. Will be truncated visually if too long. */
  habitName: string;
  /** Localized days unit, e.g. "días" / "days" / "dias". Singular when days === 1. */
  daysLabel: string;
  /** Localized motivational phrase (already resolved from i18n). */
  phrase: string;
  /** Branding suffix shown at the bottom — usually the brand name. */
  branding: string;
  /**
   * Optional override of the start gradient stop. When set, the card uses
   * this color as the warm anchor (top-left). Mid + end stops stay locked
   * to the brand teal → indigo ramp so the card still reads as "Habit
   * Sumaq" even with a custom accent.
   */
  accentColor?: string | null;
}

/**
 * Builds the SVG markup for the streak card. Pure function — no DOM,
 * no canvas. Suitable for snapshot testing and SSR previews.
 */
export function buildStreakCardSvg(params: BuildStreakCardSvgParams): string {
  const { days, habitName, daysLabel, phrase, branding, accentColor } = params;

  // Three-stop gradient for a more dramatic transition. The first two
  // colors were too close on the hue wheel (both green-teal) which read
  // as "soft fade"; the cyan mid + indigo end give the card a noticeable
  // ramp without breaking the brand palette.
  const startColor = accentColor ?? '#16a34a'; // primary green
  const midColor = '#0891b2'; // cyan (bridge)
  const endColor = '#1e3a8a'; // deep indigo (achievement vibe)

  // Truncate very long habit names so they don't overflow visually.
  const trimmedName = habitName.length > 30 ? `${habitName.slice(0, 29)}…` : habitName;

  // Word-wrap the motivational phrase to at most 2 lines, balanced so
  // both halves are roughly equal length (avoids the "define." alone
  // bug from the v1).
  const phraseLines = wrapPhrase(phrase, 32);

  // Quote decoration: the phrase should read as a single quoted unit
  // even when wrapped. Opening `"` only on line 0, closing `"` only on
  // the last line. Lines in between (if any) stay unquoted.
  // Each line is XML-escaped FIRST so quotes added by us are safe.
  const decoratedPhraseLines = phraseLines.map((line, i, arr) => {
    const safeLine = escapeXml(line);
    if (arr.length === 1) return `"${safeLine}"`;
    if (i === 0) return `"${safeLine}`;
    if (i === arr.length - 1) return `${safeLine}"`;
    return safeLine;
  });

  const safeName = escapeXml(trimmedName);
  const safeLabel = escapeXml(daysLabel);
  const safeBranding = escapeXml(branding);

  // Vertical layout (1080px tall):
  //   - 🔥 emoji at y=300
  //   - days number at y=540 (giant)
  //   - daysLabel under it at y=640
  //   - habit name at y=760
  //   - phrase at y=860 (1 or 2 lines)
  //   - branding (logo + text) centered at y=1000
  const phraseY = 860;
  const phraseLineHeight = 48;

  // Branding layout — logo on the left, text on the right, both aligned
  // as a unit centered on the canvas. The numbers are tuned by eye; if
  // you change the font size or logo scale, recompute. See doc above.
  //   - Logo intrinsic: 385.02 × 375.68
  //   - Logo scaled: 41 × 40 (scale 0.107)
  //   - Text "Habit Sumaq" at 32px ≈ 175px wide
  //   - Gap between: 14px
  //   - Total unit width ≈ 230px → group left edge at 540 - 115 = 425
  const brandingY = 988;
  const brandingGroupX = 425;
  const logoScale = 0.107;
  const textAfterLogo = 56; // logo width (~41) + gap (~15)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_SIZE}" height="${CARD_SIZE}" viewBox="0 0 ${CARD_SIZE} ${CARD_SIZE}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${startColor}"/>
      <stop offset="50%" stop-color="${midColor}"/>
      <stop offset="100%" stop-color="${endColor}"/>
    </linearGradient>
    <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="0" dy="2" result="offsetblur"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="${CARD_SIZE}" height="${CARD_SIZE}" fill="url(#bg)"/>

  <!-- Flame emoji. -->
  <text x="${CARD_SIZE / 2}" y="300" text-anchor="middle" font-size="180" font-family="system-ui, -apple-system, sans-serif">🔥</text>

  <!-- Giant streak number. -->
  <text x="${CARD_SIZE / 2}" y="540" text-anchor="middle" font-size="280" font-weight="800" font-family="system-ui, -apple-system, sans-serif" fill="#ffffff" filter="url(#textShadow)">${days}</text>

  <!-- Days label. -->
  <text x="${CARD_SIZE / 2}" y="640" text-anchor="middle" font-size="56" font-weight="500" font-family="system-ui, -apple-system, sans-serif" fill="#ffffff" opacity="0.95">${safeLabel}</text>

  <!-- Habit name. -->
  <text x="${CARD_SIZE / 2}" y="760" text-anchor="middle" font-size="56" font-weight="600" font-family="system-ui, -apple-system, sans-serif" fill="#ffffff">${safeName}</text>

  <!-- Motivational phrase (1 or 2 lines). -->
  ${decoratedPhraseLines
    .map(
      (line, i) =>
        `<text x="${CARD_SIZE / 2}" y="${phraseY + i * phraseLineHeight}" text-anchor="middle" font-size="38" font-style="italic" font-family="system-ui, -apple-system, sans-serif" fill="#ffffff" opacity="0.92">${line}</text>`,
    )
    .join('\n  ')}

  <!-- Branding: brand-mark logo + name, aligned as a single unit. -->
  <g transform="translate(${brandingGroupX}, ${brandingY})">
    <g transform="scale(${logoScale})" fill="#ffffff" opacity="0.95">
      ${BRAND_LOGO_PATHS.split('\n').join('\n      ')}
    </g>
    <text x="${textAfterLogo}" y="32" font-size="32" font-weight="500" font-family="system-ui, -apple-system, sans-serif" fill="#ffffff" opacity="0.85">${safeBranding}</text>
  </g>
</svg>`;
}

/**
 * Converts an SVG string into a PNG `Blob` via a canvas. Browser-only —
 * relies on `Image`, `URL.createObjectURL`, and `canvas.toBlob`.
 *
 * Rejects if the SVG fails to load (malformed markup, or — in dev — a
 * CORS-tainted asset reference, which we don't use today). Always
 * revokes the object URL to avoid leaks.
 */
export function svgToPngBlob(svg: string, size = CARD_SIZE): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not acquire 2D canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('canvas.toBlob returned null'));
      }, 'image/png');
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e instanceof Error ? e : new Error('Failed to load SVG into <img>'));
    };
    img.src = url;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Word-wraps `phrase` into at most 2 lines. Short phrases (≤
 * `maxCharsPerLine`) stay on a single line. Longer phrases split at the
 * space CLOSEST to the middle of the string so both halves end up
 * roughly balanced — avoids the "first line is huge, second line is
 * one word" bug that the naive "split at first space past max" approach
 * produced.
 *
 * Falls back to a hard mid-cut if the phrase has no spaces at all
 * (defensive — our phrase pool never hits this).
 */
function wrapPhrase(phrase: string, maxCharsPerLine: number): string[] {
  if (phrase.length <= maxCharsPerLine) return [phrase];

  const mid = Math.floor(phrase.length / 2);

  // Find the space closest to the middle index. Returns -1 if no space
  // exists.
  let bestBreak = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < phrase.length; i++) {
    if (phrase[i] === ' ') {
      const distance = Math.abs(i - mid);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestBreak = i;
      }
    }
  }

  if (bestBreak === -1) {
    return [phrase.slice(0, mid), phrase.slice(mid)];
  }

  return [phrase.slice(0, bestBreak), phrase.slice(bestBreak + 1)];
}
