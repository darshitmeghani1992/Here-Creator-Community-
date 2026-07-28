"use client";

/**
 * Client-side memory of which rooms the user has already joined and the guest
 * name they picked, so the join sheet only appears once per room (kickoff B).
 */
const JOINED_KEY = "here:joinedRooms";
const NAME_KEY = "here:guestName";

export function hasJoined(roomId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const set = JSON.parse(localStorage.getItem(JOINED_KEY) || "{}");
    return !!set[roomId];
  } catch {
    return false;
  }
}

export function rememberJoined(roomId: string) {
  if (typeof window === "undefined") return;
  try {
    const set = JSON.parse(localStorage.getItem(JOINED_KEY) || "{}");
    set[roomId] = true;
    localStorage.setItem(JOINED_KEY, JSON.stringify(set));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function getGuestName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) || "";
}

export function setGuestName(name: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
}
