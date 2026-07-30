import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { levelFromPoints } from "@/lib/fan";

/**
 * Server-only points engine. The service-role client is the ONLY writer to
 * `fans` / `point_events` / `fan_badges`, so fans can never forge points.
 * Every scoring path (check-ins now, games later) funnels through here.
 */

export const DAILY_CHECKIN_POINTS = 5;

type Admin = ReturnType<typeof createAdminClient>;

/** Records a point grant and rolls it into the fan's total + level. */
export async function awardPoints(
  admin: Admin,
  creatorId: string,
  userId: string,
  kind: string,
  points: number,
  activityId?: string,
): Promise<void> {
  if (points !== 0) {
    await admin.from("point_events").insert({
      creator_id: creatorId,
      user_id: userId,
      activity_id: activityId ?? null,
      kind,
      points,
    });
  }
}

async function grantBadge(
  admin: Admin,
  creatorId: string,
  userId: string,
  key: string,
): Promise<void> {
  await admin
    .from("fan_badges")
    .upsert(
      { creator_id: creatorId, user_id: userId, badge_key: key },
      { onConflict: "creator_id,user_id,badge_key", ignoreDuplicates: true },
    );
}

export interface FanStatus {
  points: number;
  level: number;
  streak_days: number;
  rank: number;
  earned: number; // points earned on this check-in (0 if already checked in today)
  badges: string[];
}

/**
 * Idempotent daily check-in for a signed-in fan: ensures the fan (and their
 * profile row) exist, awards founding/first-100 badges on first join, grants
 * daily points + advances the streak once per day, and returns fresh status.
 */
export async function checkinFan(
  creatorId: string,
  userId: string,
  displayName: string,
): Promise<FanStatus> {
  const admin = createAdminClient();

  // 1. Ensure a public profile row so leaderboards can show a name.
  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) {
    await admin
      .from("users")
      .insert({ id: userId, display_name: displayName || "Fan", is_guest: false });
  }

  // 2. Ensure a fan row; award join badges on creation.
  const newBadges: string[] = [];
  let { data: fan } = await admin
    .from("fans")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!fan) {
    const { count } = await admin
      .from("fans")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", creatorId);
    const priorFans = count ?? 0;
    const { data: created } = await admin
      .from("fans")
      .insert({ creator_id: creatorId, user_id: userId, points: 0, level: 1, streak_days: 0 })
      .select()
      .single();
    fan = created;
    if (priorFans < 10) newBadges.push("founding_member");
    if (priorFans < 100) newBadges.push("first_100");
  }

  // 3. Daily check-in: points + streak, at most once per calendar day.
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  let earned = 0;
  if (fan && fan.last_active_date !== today) {
    earned = DAILY_CHECKIN_POINTS;
    const streak = fan.last_active_date === yesterday ? (fan.streak_days || 0) + 1 : 1;
    const points = (fan.points || 0) + earned;
    const level = levelFromPoints(points).level;
    await admin
      .from("fans")
      .update({ points, level, streak_days: streak, last_active_date: today })
      .eq("creator_id", creatorId)
      .eq("user_id", userId);
    await awardPoints(admin, creatorId, userId, "daily_checkin", earned);
    if (streak >= 7) newBadges.push("streak_7");
    if (streak >= 30) newBadges.push("streak_30");
    if (level >= 4) newBadges.push("superfan");
    if (level >= 6) newBadges.push("og");
    fan = { ...fan, points, level, streak_days: streak, last_active_date: today };
  }

  // 4. Persist any newly-earned badges (dupes ignored).
  for (const key of newBadges) await grantBadge(admin, creatorId, userId, key);

  // 5. Rank = number of fans ahead + 1.
  const { count: ahead } = await admin
    .from("fans")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", creatorId)
    .gt("points", fan!.points);

  const { data: badgeRows } = await admin
    .from("fan_badges")
    .select("badge_key")
    .eq("creator_id", creatorId)
    .eq("user_id", userId);

  return {
    points: fan!.points,
    level: fan!.level,
    streak_days: fan!.streak_days,
    rank: (ahead ?? 0) + 1,
    earned,
    badges: (badgeRows ?? []).map((b: { badge_key: string }) => b.badge_key),
  };
}
