export type RoomKind = "permanent" | "temporary";

export interface Creator {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  is_live: boolean;
  owner_id: string | null;
  theme: string | null;
  tagline: string | null;
  bio: string | null;
  cover_url: string | null;
  appearance: Appearance | null;
}

/** Button shape / fill styles a creator can pick (Linktree-style). */
export type ButtonShape = "rounded" | "pill" | "sharp";
export type ButtonFill = "solid" | "soft" | "outline" | "glass";
export type BackgroundType = "flat" | "gradient" | "image";

/** The full personalization blob stored on creators.appearance (jsonb). */
export interface Appearance {
  background: {
    type: BackgroundType;
    color: string; // flat colour, or gradient stop 1
    color2?: string; // gradient stop 2
    angle?: number; // gradient angle in degrees
    imageUrl?: string; // background image
  };
  button: {
    shape: ButtonShape;
    fill: ButtonFill;
    color: string; // button colour / accent
    textColor: string; // text on a solid button
    shadow: boolean;
  };
  font: string; // a key from FONTS in lib/appearance.ts
}

/** One link-in-bio link on a creator's space. */
export interface CreatorLink {
  id: string;
  creator_id: string;
  title: string;
  url: string;
  icon: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
}

/** A fan's progression within one creator's world (points/level/streak). */
export interface Fan {
  creator_id: string;
  user_id: string;
  points: number;
  level: number;
  streak_days: number;
  last_active_date: string | null;
  joined_at: string;
}

export interface PointEvent {
  id: number;
  creator_id: string;
  user_id: string;
  activity_id: string | null;
  kind: string;
  points: number;
  created_at: string;
}

export interface FanBadge {
  creator_id: string;
  user_id: string;
  badge_key: string;
  awarded_at: string;
}

/** One row in a leaderboard, joined with the fan's profile. */
export interface LeaderRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  level?: number;
}

export interface Room {
  id: string;
  creator_id: string;
  name: string;
  kind: RoomKind;
  closes_at: string | null; // null = permanent
  is_open: boolean;
  created_at: string;
  capacity: number | null; // null = unlimited
}

export interface AppUser {
  id: string; // = auth.uid()
  display_name: string;
  avatar_url: string | null;
  is_guest: boolean;
}

export type AttachmentType = "image" | "video" | "file";

export interface Message {
  id: number;
  room_id: string;
  user_id: string | null;
  body: string;
  is_creator: boolean;
  created_at: string;
  attachment_url: string | null;
  attachment_type: AttachmentType | null;
  attachment_name: string | null;
}

/** Message joined with its author's display name, as rendered in the chat. */
export interface ChatMessage extends Message {
  author_name: string | null;
}

export interface Poll {
  id: string;
  room_id: string | null; // null = space-level poll (shown in the Polls tab)
  space_id: string | null;
  creator_id: string | null;
  question: string;
  options: string[];
  option_images: string[] | null; // parallel to options; "" = no image
  is_open: boolean;
  created_at: string;
}

/** One option in the create-poll form. */
export interface PollOptionInput {
  label: string;
  image: string | null;
}

export interface PollVoteRow {
  option_index: number;
  user_id: string;
}

/** A poll plus its current votes, as handed to the client. */
export interface PollState {
  poll: Poll;
  votes: PollVoteRow[];
}

/** Minimal DB typing for the supabase-js generic. Kept intentionally loose;
 *  enough to get inference on the tables we touch without a full codegen. */
export interface Database {
  public: {
    Tables: {
      creators: {
        Row: Creator;
        Insert: Partial<Creator> & { handle: string; display_name: string };
        Update: Partial<Creator>;
      };
      rooms: {
        Row: Room;
        Insert: Partial<Room> & { creator_id: string; name: string; kind: RoomKind };
        Update: Partial<Room>;
      };
      users: {
        Row: AppUser;
        Insert: AppUser;
        Update: Partial<AppUser>;
      };
      messages: {
        Row: Message;
        Insert: Partial<Message> & { room_id: string; body: string };
        Update: Partial<Message>;
      };
      creator_links: {
        Row: CreatorLink;
        Insert: Partial<CreatorLink> & { creator_id: string; title: string; url: string };
        Update: Partial<CreatorLink>;
      };
      fans: {
        Row: Fan;
        Insert: Partial<Fan> & { creator_id: string; user_id: string };
        Update: Partial<Fan>;
      };
      point_events: {
        Row: PointEvent;
        Insert: Partial<PointEvent> & { creator_id: string; user_id: string; kind: string; points: number };
        Update: Partial<PointEvent>;
      };
      fan_badges: {
        Row: FanBadge;
        Insert: Partial<FanBadge> & { creator_id: string; user_id: string; badge_key: string };
        Update: Partial<FanBadge>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
