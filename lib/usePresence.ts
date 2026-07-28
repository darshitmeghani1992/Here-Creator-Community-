"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Real Supabase Realtime presence for a channel.
 *
 * - Pass `self` to register the current viewer (room occupants, space viewers);
 *   the returned count then includes them.
 * - Pass `null` to read a channel passively (e.g. a Space room card showing how
 *   many people are *inside* a room you haven't joined) without being counted.
 *
 * Count = number of distinct presence keys. Presence is never faked — with no
 * one connected this returns 0.
 */
export function usePresenceCount(
  channelName: string,
  self: { key: string; meta?: Record<string, unknown> } | null,
): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createClient();
    const channel = supabase.channel(channelName, {
      config: { presence: { key: self?.key ?? crypto.randomUUID() } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && self) {
          await channel.track(self.meta ?? { online_at: Date.now() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // Re-subscribe only when the channel or the self identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, self?.key]);

  return count;
}
