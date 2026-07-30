/**
 * Fan levels — pure helpers shared by the client (status card) and server
 * (points engine). Points accrue within a single creator's world.
 */
export interface FanLevel {
  level: number;
  name: string;
  min: number; // points required to reach this level
}

export const LEVELS: FanLevel[] = [
  { level: 1, name: "New Fan", min: 0 },
  { level: 2, name: "Supporter", min: 50 },
  { level: 3, name: "Regular", min: 150 },
  { level: 4, name: "Superfan", min: 400 },
  { level: 5, name: "VIP", min: 900 },
  { level: 6, name: "OG", min: 2000 },
];

export function levelFromPoints(points: number): FanLevel {
  let current = LEVELS[0];
  for (const l of LEVELS) if (points >= l.min) current = l;
  return current;
}

/** The next level up, or null if already maxed. */
export function nextLevel(points: number): FanLevel | null {
  return LEVELS.find((l) => l.min > points) ?? null;
}

/** Progress (0–1) toward the next level, for a progress bar. */
export function levelProgress(points: number): number {
  const cur = levelFromPoints(points);
  const nxt = nextLevel(points);
  if (!nxt) return 1;
  return Math.max(0, Math.min(1, (points - cur.min) / (nxt.min - cur.min)));
}
