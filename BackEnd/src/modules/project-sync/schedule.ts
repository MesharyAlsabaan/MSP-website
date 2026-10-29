/**
 * Run times. Riyadh is UTC+3 all year (no daylight saving), so a Riyadh
 * wall-clock time maps to one fixed UTC time: 08:00 → 05:00Z, 19:00 → 16:00Z.
 * A slot is named by its UTC instant, e.g. `2026-10-29T05:00Z`; that name is
 * the run's unique key, which is what stops a slot running twice.
 */

const RIYADH_OFFSET_MIN = 180;

/** "08:00,19:00" (Riyadh) → minutes after UTC midnight, sorted. */
export function parseTimes(spec = '08:00,19:00'): number[] {
  const out = spec.split(',').map((t) => {
    const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(t);
    if (!m || +m[1] > 23 || +m[2] > 59) throw new Error(`Bad PROJECT_SYNC_TIMES entry "${t}" — use HH:MM, Riyadh time`);
    return (((+m[1] * 60 + +m[2] - RIYADH_OFFSET_MIN) % 1440) + 1440) % 1440;
  });
  return [...new Set(out)].sort((a, b) => a - b);
}

const dayStart = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** First slot strictly after `now`. */
export function nextSlot(now: Date, times: number[]): Date {
  const base = dayStart(now);
  for (let day = 0; day < 2; day++) {
    for (const t of times) {
      const at = base + day * 86_400_000 + t * 60_000;
      if (at > now.getTime()) return new Date(at);
    }
  }
  throw new Error('No sync times configured');
}

/** Latest slot at or before `now`. */
export function previousSlot(now: Date, times: number[]): Date {
  const base = dayStart(now);
  for (let day = 0; day < 2; day++) {
    for (const t of [...times].reverse()) {
      const at = base - day * 86_400_000 + t * 60_000;
      if (at <= now.getTime()) return new Date(at);
    }
  }
  throw new Error('No sync times configured');
}

export const slotKey = (d: Date) => `${d.toISOString().slice(0, 16)}Z`;
