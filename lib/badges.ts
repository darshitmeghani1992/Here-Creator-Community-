/**
 * Badge catalog — pure metadata shared by client (rendering) and server
 * (awarding). Badges are earned within a creator's world and become part of a
 * fan's identity there.
 */
export interface BadgeDef {
  key: string;
  name: string;
  emoji: string;
  desc: string;
}

export const BADGES: Record<string, BadgeDef> = {
  founding_member: {
    key: "founding_member",
    name: "Founding Member",
    emoji: "◆",
    desc: "One of the first 10 fans here",
  },
  first_100: {
    key: "first_100",
    name: "First 100",
    emoji: "💯",
    desc: "Joined in the first 100 fans",
  },
  superfan: {
    key: "superfan",
    name: "Superfan",
    emoji: "⭐",
    desc: "Reached Superfan level",
  },
  streak_7: {
    key: "streak_7",
    name: "7-Day Streak",
    emoji: "🔥",
    desc: "Showed up 7 days in a row",
  },
  streak_30: {
    key: "streak_30",
    name: "30-Day Streak",
    emoji: "🔥",
    desc: "Showed up 30 days in a row",
  },
  giveaway_winner: {
    key: "giveaway_winner",
    name: "Giveaway Winner",
    emoji: "🎁",
    desc: "Won a giveaway",
  },
  challenge_champ: {
    key: "challenge_champ",
    name: "Challenge Champion",
    emoji: "🏆",
    desc: "Won a challenge",
  },
  room_regular: {
    key: "room_regular",
    name: "Room Regular",
    emoji: "💬",
    desc: "A familiar face in the rooms",
  },
  og: {
    key: "og",
    name: "OG Fan",
    emoji: "👑",
    desc: "Reached the top level",
  },
};

export function badgeDef(key: string): BadgeDef | null {
  return BADGES[key] ?? null;
}
