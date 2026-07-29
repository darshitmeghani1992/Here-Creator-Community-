"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadPublicImage } from "@/lib/upload";
import { THEMES, themeVars, themeById } from "@/lib/themes";
import {
  FONTS,
  resolveAppearance,
  pageBackgroundCss,
  buttonStyle,
  fontFamilyCss,
  defaultAppearance,
} from "@/lib/appearance";
import type {
  Creator,
  CreatorLink,
  Appearance,
  BackgroundType,
  ButtonShape,
  ButtonFill,
} from "@/lib/types";

/**
 * The full Linktree-style personalization panel shown in Studio: profile,
 * background, buttons, font, theme presets, and the link list — with a live
 * preview. Appearance/profile changes are debounce-saved to `creators`; link
 * edits write to `creator_links`.
 */
export function AppearanceEditor({
  creator,
  initialLinks,
}: {
  creator: Creator;
  initialLinks: CreatorLink[];
}) {
  const supabase = createClient();

  const [theme, setTheme] = useState(creator.theme ?? "lumina");
  const [ap, setAp] = useState<Appearance>(
    creator.appearance ?? defaultAppearance(creator.theme),
  );
  const [tagline, setTagline] = useState(creator.tagline ?? "");
  const [bio, setBio] = useState(creator.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(creator.avatar_url ?? "");
  const [coverUrl, setCoverUrl] = useState(creator.cover_url ?? "");
  const [links, setLinks] = useState<CreatorLink[]>(initialLinks);
  const [saved, setSaved] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const mounted = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Debounced save of appearance + profile fields onto the creator row.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase
        .from("creators")
        .update({
          theme,
          appearance: ap,
          tagline: tagline.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl || null,
          cover_url: coverUrl || null,
        })
        .eq("id", creator.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    }, 650);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, ap, tagline, bio, avatarUrl, coverUrl]);

  function patchBg(next: Partial<Appearance["background"]>) {
    setAp((p) => ({ ...p, background: { ...p.background, ...next } }));
  }
  function patchBtn(next: Partial<Appearance["button"]>) {
    setAp((p) => ({ ...p, button: { ...p.button, ...next } }));
  }

  /** Applying a theme preset re-skins the palette AND the appearance colours. */
  function applyPreset(id: string) {
    const t = themeById(id);
    setTheme(id);
    setAp((p) => ({
      ...p,
      background: {
        ...p.background,
        color: t.bg,
        color2: t.card,
      },
      button: { ...p.button, color: t.accent, textColor: t.onAccent },
    }));
  }

  async function uploadTo(
    file: File,
    prefix: string,
    onDone: (url: string) => void,
    key: string,
  ) {
    setBusyKey(key);
    try {
      const url = await uploadPublicImage(file, `${creator.id}/${prefix}`);
      onDone(url);
    } catch {
      /* ignore — keep previous */
    } finally {
      setBusyKey(null);
    }
  }

  /* ── links ── */
  async function addLink() {
    const position = links.length
      ? Math.max(...links.map((l) => l.position)) + 1
      : 0;
    const { data } = await supabase
      .from("creator_links")
      .insert({
        creator_id: creator.id,
        title: "New link",
        url: "https://",
        icon: "🔗",
        position,
        is_active: true,
      })
      .select()
      .single();
    if (data) setLinks((p) => [...p, data as CreatorLink]);
  }

  function patchLinkLocal(id: string, next: Partial<CreatorLink>) {
    setLinks((p) => p.map((l) => (l.id === id ? { ...l, ...next } : l)));
  }

  async function saveLink(id: string, next: Partial<CreatorLink>) {
    await supabase.from("creator_links").update(next).eq("id", id);
  }

  async function deleteLink(id: string) {
    setLinks((p) => p.filter((l) => l.id !== id));
    await supabase.from("creator_links").delete().eq("id", id);
  }

  async function moveLink(id: string, dir: -1 | 1) {
    const ordered = [...links].sort((a, b) => a.position - b.position);
    const i = ordered.findIndex((l) => l.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    const a = ordered[i];
    const b = ordered[j];
    // Swap positions and persist both.
    patchLinkLocal(a.id, { position: b.position });
    patchLinkLocal(b.id, { position: a.position });
    await Promise.all([
      saveLink(a.id, { position: b.position }),
      saveLink(b.id, { position: a.position }),
    ]);
  }

  const orderedLinks = useMemo(
    () => [...links].sort((a, b) => a.position - b.position),
    [links],
  );

  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <SectionTitle>APPEARANCE</SectionTitle>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: saved ? "var(--green)" : "var(--faint)",
            transition: "color .2s",
          }}
        >
          {saved ? "✓ Saved" : "Auto-saves"}
        </span>
      </div>

      {/* ── Live preview ── */}
      <Preview
        theme={theme}
        ap={ap}
        name={creator.display_name}
        handle={creator.handle}
        tagline={tagline}
        bio={bio}
        avatarUrl={avatarUrl}
        coverUrl={coverUrl}
        links={orderedLinks.filter((l) => l.is_active)}
      />

      {/* ── Profile ── */}
      <Group label="Profile">
        <FieldLabel>Tagline</FieldLabel>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Music, late nights & good company 🎧"
          maxLength={80}
          style={input}
        />
        <FieldLabel style={{ marginTop: 12 }}>Bio</FieldLabel>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A line about you and what happens here."
          maxLength={160}
          rows={2}
          style={{ ...input, resize: "vertical", fontFamily: "inherit" }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <UploadTile
            label="Avatar"
            preview={avatarUrl}
            busy={busyKey === "avatar"}
            onFile={(f) => uploadTo(f, "avatar", setAvatarUrl, "avatar")}
            round
          />
          <UploadTile
            label="Cover"
            preview={coverUrl}
            busy={busyKey === "cover"}
            onFile={(f) => uploadTo(f, "cover", setCoverUrl, "cover")}
            wide
          />
        </div>
      </Group>

      {/* ── Theme presets ── */}
      <Group label="Theme preset">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => applyPreset(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  minWidth: 0,
                  cursor: "pointer",
                  textAlign: "left",
                  padding: 8,
                  borderRadius: 12,
                  background: t.bg,
                  border: active ? "2px solid var(--violet)" : "1px solid var(--line2)",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    flex: "none",
                    borderRadius: 7,
                    background: t.accent,
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,.12)",
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: t.ink,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {t.name}
                </span>
              </button>
            );
          })}
        </div>
      </Group>

      {/* ── Background ── */}
      <Group label="Background">
        <SegRow
          options={[
            ["flat", "Flat"],
            ["gradient", "Gradient"],
            ["image", "Image"],
          ]}
          value={ap.background.type}
          onChange={(v) => patchBg({ type: v as BackgroundType })}
        />
        {ap.background.type !== "image" && (
          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <ColorField
              label={ap.background.type === "gradient" ? "Colour 1" : "Colour"}
              value={ap.background.color}
              onChange={(v) => patchBg({ color: v })}
            />
            {ap.background.type === "gradient" && (
              <>
                <ColorField
                  label="Colour 2"
                  value={ap.background.color2 ?? "#ffffff"}
                  onChange={(v) => patchBg({ color2: v })}
                />
                <div>
                  <FieldLabel>Angle</FieldLabel>
                  <input
                    type="number"
                    value={ap.background.angle ?? 160}
                    onChange={(e) => patchBg({ angle: Number(e.target.value) || 0 })}
                    style={{ ...input, width: 88 }}
                  />
                </div>
              </>
            )}
          </div>
        )}
        {ap.background.type === "image" && (
          <div style={{ marginTop: 12 }}>
            <UploadTile
              label="Background image"
              preview={ap.background.imageUrl || ""}
              busy={busyKey === "bgimg"}
              onFile={(f) => uploadTo(f, "bg", (url) => patchBg({ imageUrl: url }), "bgimg")}
              wide
            />
          </div>
        )}
      </Group>

      {/* ── Buttons ── */}
      <Group label="Buttons">
        <FieldLabel>Shape</FieldLabel>
        <SegRow
          options={[
            ["rounded", "Rounded"],
            ["pill", "Pill"],
            ["sharp", "Sharp"],
          ]}
          value={ap.button.shape}
          onChange={(v) => patchBtn({ shape: v as ButtonShape })}
        />
        <FieldLabel style={{ marginTop: 12 }}>Fill</FieldLabel>
        <SegRow
          options={[
            ["solid", "Solid"],
            ["soft", "Soft"],
            ["outline", "Outline"],
            ["glass", "Glass"],
          ]}
          value={ap.button.fill}
          onChange={(v) => patchBtn({ fill: v as ButtonFill })}
        />
        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <ColorField
            label="Button"
            value={ap.button.color}
            onChange={(v) => patchBtn({ color: v })}
          />
          <ColorField
            label="Text"
            value={ap.button.textColor}
            onChange={(v) => patchBtn({ textColor: v })}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              color: "var(--ink)",
              alignSelf: "flex-end",
              cursor: "pointer",
              paddingBottom: 6,
            }}
          >
            <input
              type="checkbox"
              checked={ap.button.shadow}
              onChange={(e) => patchBtn({ shadow: e.target.checked })}
            />
            Shadow
          </label>
        </div>
      </Group>

      {/* ── Font ── */}
      <Group label="Font">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {FONTS.map((f) => {
            const active = ap.font === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setAp((p) => ({ ...p, font: f.key }))}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  background: active ? "var(--violet-100)" : "var(--card)",
                  border: active ? "2px solid var(--violet)" : "1px solid var(--line2)",
                  color: "var(--ink)",
                  fontFamily: fontFamilyCss(f.key),
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {f.name}
              </button>
            );
          })}
        </div>
      </Group>

      {/* ── Links ── */}
      <Group label="Links">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {orderedLinks.map((l, idx) => (
            <div
              key={l.id}
              style={{
                border: "1px solid var(--line2)",
                borderRadius: 14,
                padding: 10,
                background: "var(--card)",
                opacity: l.is_active ? 1 : 0.55,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={l.icon ?? ""}
                  onChange={(e) => patchLinkLocal(l.id, { icon: e.target.value })}
                  onBlur={() => saveLink(l.id, { icon: l.icon })}
                  placeholder="🔗"
                  style={{ ...input, width: 46, textAlign: "center", padding: "10px 4px" }}
                />
                <input
                  value={l.title}
                  onChange={(e) => patchLinkLocal(l.id, { title: e.target.value })}
                  onBlur={() => saveLink(l.id, { title: l.title })}
                  placeholder="Title"
                  style={{ ...input, flex: 1, minWidth: 0, fontWeight: 700 }}
                />
              </div>
              <input
                value={l.url}
                onChange={(e) => patchLinkLocal(l.id, { url: e.target.value })}
                onBlur={() => saveLink(l.id, { url: l.url })}
                placeholder="https://…"
                style={{ ...input, marginTop: 8, fontSize: 13 }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                <IconBtn
                  disabled={idx === 0}
                  onClick={() => moveLink(l.id, -1)}
                  label="Move up"
                >
                  ↑
                </IconBtn>
                <IconBtn
                  disabled={idx === orderedLinks.length - 1}
                  onClick={() => moveLink(l.id, 1)}
                  label="Move down"
                >
                  ↓
                </IconBtn>
                <button
                  onClick={() => {
                    const next = !l.is_active;
                    patchLinkLocal(l.id, { is_active: next });
                    saveLink(l.id, { is_active: next });
                  }}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    border: "1px solid var(--line2)",
                    background: "var(--bg)",
                    color: l.is_active ? "var(--green)" : "var(--muted)",
                    borderRadius: 9,
                    padding: "7px 11px",
                    cursor: "pointer",
                  }}
                >
                  {l.is_active ? "Visible" : "Hidden"}
                </button>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => deleteLink(l.id)}
                  aria-label="Delete link"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    border: "1px solid var(--line2)",
                    background: "var(--bg)",
                    color: "var(--red)",
                    borderRadius: 9,
                    padding: "7px 11px",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addLink}
          style={{
            width: "100%",
            marginTop: 10,
            border: "1.5px dashed var(--violet-200)",
            background: "var(--violet-100)",
            color: "var(--violet-dk)",
            borderRadius: 12,
            padding: 12,
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          ＋ Add link
        </button>
      </Group>
    </div>
  );
}

/* ─────────────────────────── live preview ─────────────────────────── */

function Preview({
  theme,
  ap,
  name,
  handle,
  tagline,
  bio,
  avatarUrl,
  coverUrl,
  links,
}: {
  theme: string;
  ap: Appearance;
  name: string;
  handle: string;
  tagline: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  links: CreatorLink[];
}) {
  const resolved = resolveAppearance(theme, ap);
  const btn = buttonStyle(resolved);
  return (
    <div
      style={{
        ...themeVars(theme),
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid var(--line2)",
        marginBottom: 20,
        background: pageBackgroundCss(resolved),
        fontFamily: fontFamilyCss(resolved.font),
      }}
    >
      <div
        style={{
          height: 70,
          background: coverUrl
            ? `center/cover no-repeat url(${coverUrl})`
            : "linear-gradient(135deg, color-mix(in srgb, var(--violet) 85%, #fff), var(--violet))",
        }}
      />
      <div style={{ padding: "0 16px 18px", textAlign: "center", color: "var(--ink)" }}>
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 18,
            margin: "-29px auto 0",
            background: avatarUrl
              ? `center/cover no-repeat url(${avatarUrl})`
              : "var(--card)",
            border: "3px solid var(--card)",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            fontSize: 22,
            color: "var(--violet)",
          }}
        >
          {!avatarUrl && name.slice(0, 1).toUpperCase()}
        </div>
        <div style={{ fontWeight: 800, fontSize: 16, marginTop: 7 }}>{name}</div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--violet)" }}>
          @{handle}
        </div>
        {tagline && <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 5 }}>{tagline}</div>}
        {bio && (
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{bio}</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {(links.length ? links.slice(0, 3) : PLACEHOLDER_LINKS).map((l, i) => (
            <div
              key={i}
              style={{
                ...btn,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 14px",
                fontSize: 13.5,
              }}
            >
              <span style={{ width: 22, textAlign: "center" }}>{l.icon || "🔗"}</span>
              <span style={{ flex: 1, textAlign: "left", fontWeight: 700 }}>{l.title}</span>
              <span style={{ opacity: 0.5 }}>›</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const PLACEHOLDER_LINKS = [
  { icon: "🎵", title: "New single" },
  { icon: "▶️", title: "YouTube" },
  { icon: "🛍️", title: "Shop" },
];

/* ─────────────────────────── small building blocks ─────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: ".08em",
        color: "var(--faint)",
      }}
    >
      {children}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 14,
        border: "1px solid var(--line)",
        borderRadius: 16,
        background: "var(--card)",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}

function FieldLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: ".06em",
        color: "var(--faint)",
        marginBottom: 6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SegRow({
  options,
  value,
  onChange,
}: {
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map(([val, label]) => {
        const active = value === val;
        return (
          <button
            key={val}
            onClick={() => onChange(val)}
            style={{
              flex: 1,
              padding: "10px 6px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 12.5,
              border: active ? "none" : "1px solid var(--line2)",
              background: active ? "var(--violet)" : "var(--bg)",
              color: active ? "var(--on-accent)" : "var(--ink)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: "1px solid var(--line2)",
          borderRadius: 10,
          padding: "5px 8px",
          background: "var(--bg)",
        }}
      >
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#7c3aed"}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 26,
            height: 26,
            border: "none",
            background: "none",
            padding: 0,
            cursor: "pointer",
          }}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 74,
            border: "none",
            background: "none",
            outline: "none",
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--ink)",
          }}
        />
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        border: "1px solid var(--line2)",
        background: "var(--bg)",
        color: "var(--ink)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1,
        fontWeight: 800,
        fontSize: 14,
      }}
    >
      {children}
    </button>
  );
}

function UploadTile({
  label,
  preview,
  onFile,
  busy,
  round,
  wide,
}: {
  label: string;
  preview: string;
  onFile: (f: File) => void;
  busy?: boolean;
  round?: boolean;
  wide?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{ flex: wide ? 1 : "none" }}>
      <FieldLabel>{label}</FieldLabel>
      <button
        onClick={() => ref.current?.click()}
        style={{
          width: wide ? "100%" : 58,
          height: 58,
          borderRadius: round ? "50%" : 12,
          border: "1px solid var(--line2)",
          cursor: "pointer",
          overflow: "hidden",
          background: preview
            ? `center/cover no-repeat url(${preview})`
            : "var(--bg)",
          color: "var(--muted)",
          fontSize: 12,
          fontWeight: 700,
          display: "grid",
          placeItems: "center",
        }}
      >
        {busy ? "…" : preview ? "" : "＋"}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
        style={{ display: "none" }}
      />
    </div>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--line2)",
  background: "var(--bg)",
  borderRadius: 10,
  padding: "11px 12px",
  outline: "none",
  fontSize: 14,
  color: "var(--ink)",
  fontFamily: "inherit",
};
