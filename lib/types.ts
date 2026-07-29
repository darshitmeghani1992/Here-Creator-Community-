export type RoomKind = "permanent" | "temporary";

export interface Creator {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  is_live: boolean;
  owner_id: string | null;
  theme: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
