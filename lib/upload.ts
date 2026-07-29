"use client";

import { createClient } from "@/lib/supabase/client";
import type { AttachmentType } from "@/lib/types";

const MAX_IMAGE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO = 25 * 1024 * 1024; // 25 MB
const MAX_FILE = 25 * 1024 * 1024; // 25 MB
const MAX_VIDEO_SECONDS = 30;
const MAX_PROFILE_IMAGE = 6 * 1024 * 1024; // 6 MB — avatars, covers, link thumbs

export interface Attachment {
  url: string;
  type: AttachmentType;
  name: string;
}

function kindOf(file: File): AttachmentType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

function humanMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

/** Reads a video's duration (seconds) from its metadata, client-side. */
function videoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration || 0);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that video file."));
    };
    v.src = url;
  });
}

/**
 * Validates and uploads a chat attachment to Supabase Storage, returning a
 * public URL. Enforces per-type size caps and a 30s limit on videos.
 */
export async function uploadAttachment(
  file: File,
  roomId: string,
  userId: string,
): Promise<Attachment> {
  const type = kindOf(file);

  if (type === "image" && file.size > MAX_IMAGE) {
    throw new Error(`Image too large — max ${humanMb(MAX_IMAGE)}.`);
  }
  if (type === "video") {
    if (file.size > MAX_VIDEO) {
      throw new Error(`Video too large — max ${humanMb(MAX_VIDEO)}.`);
    }
    const seconds = await videoDuration(file).catch(() => 0);
    if (seconds > MAX_VIDEO_SECONDS + 1) {
      throw new Error(`Video must be ${MAX_VIDEO_SECONDS} seconds or shorter.`);
    }
  }
  if (type === "file" && file.size > MAX_FILE) {
    throw new Error(`File too large — max ${humanMb(MAX_FILE)}.`);
  }

  const supabase = createClient();
  const safeName =
    file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "attachment";
  const path = `${roomId}/${userId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });
  if (error) throw error;

  const { data } = supabase.storage.from("attachments").getPublicUrl(path);
  return { url: data.publicUrl, type, name: file.name };
}

/**
 * Uploads a profile-style image (avatar, cover, link thumbnail) to the public
 * attachments bucket and returns its public URL. Images only, 6 MB cap.
 */
export async function uploadPublicImage(
  file: File,
  prefix: string,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_PROFILE_IMAGE) {
    throw new Error(`Image too large — max ${humanMb(MAX_PROFILE_IMAGE)}.`);
  }
  const supabase = createClient();
  const safeName =
    file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60) || "image";
  const path = `${prefix}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });
  if (error) throw error;
  return supabase.storage.from("attachments").getPublicUrl(path).data.publicUrl;
}
