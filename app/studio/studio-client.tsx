"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Creator } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { signInWithEmail, signInWithGoogle, signOut } from "@/lib/auth-client";
import {
  normalizeHandle,
  validateHandle,
  HANDLE_MIN,
} from "@/lib/handle";
import { THEMES, themeVars, DEFAULT_THEME } from "@/lib/themes";

type SpaceState = "loading" | "none" | Creator;

export function StudioClient() {
  const supabase = createClient();
  const { user, loading: userLoading } = useUser();
  const [space, setSpace] = useState<SpaceState>("loading");

  // Look up the space this user owns (if any).
  const refetchSpace = useCallback(async () => {
    if (!user) {
      setSpace("none");
      return;
    }
    const { data } = await supabase
      .from("creators")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();
    setSpace((data as Creator) ?? "none");
  }, [user, supabase]);

  useEffect(() => {
    if (userLoading) return;
    setSpace("loading");
    refetchSpace();
  }, [userLoading, refetchSpace]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <StudioHeader signedIn={!!user} />
      <div
        className="hb"
        style={{ flex: 1, overflowY: "auto", padding: "8px 20px 28px" }}
      >
        {userLoading || space === "loading" ? (
          <Centered>
            <Spinner />
          </Centered>
        ) : !user ? (
          <AuthCard />
        ) : space === "none" ? (
          <Onboarding
            email={user.email ?? null}
            suggestedName={
              (user.user_metadata?.name as string) ||
              (user.email ? user.email.split("@")[0] : "")
            }
            onCreated={refetchSpace}
          />
        ) : (
          <YourSpace creator={space} />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── header ─────────────────────────── */

function StudioHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <div
      style={{
        flex: "none",
        padding: "16px 20px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: "var(--violet)",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 6px 16px rgba(124,58,237,.35)",
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: 3, background: "#fff" }} />
      </div>
      <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-.02em" }}>
        HERE <span style={{ color: "var(--muted)", fontWeight: 700 }}>Studio</span>
      </div>
      <div style={{ flex: 1 }} />
      {signedIn && (
        <button
          onClick={async () => {
            await signOut();
            window.location.reload();
          }}
          style={{
            border: "1px solid var(--line2)",
            background: "var(--card)",
            color: "var(--muted)",
            borderRadius: 999,
            padding: "7px 13px",
            fontWeight: 700,
            fontSize: 12.5,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────── auth ─────────────────────────── */

function AuthCard() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink() {
    const value = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInWithEmail(value, "/studio");
      setSent(true);
    } catch {
      setError("Couldn't send the link — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Centered>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <BigEmoji>📬</BigEmoji>
          <h2 style={h2Style}>Check your email</h2>
          <p style={pStyle}>
            We sent a magic link to <b style={{ color: "var(--ink)" }}>{email}</b>.
            Tap it to finish signing in — then you&apos;ll create your space.
          </p>
          <button onClick={() => setSent(false)} style={ghostBtn}>
            Use a different email
          </button>
        </div>
      </Centered>
    );
  }

  return (
    <div style={{ paddingTop: 18 }}>
      <h1 style={h1Style}>Create your space</h1>
      <p style={{ ...pStyle, marginBottom: 22 }}>
        Your own place on HERE — a link you share so people can drop in and chat
        with you in real time. Sign in to get started.
      </p>

      <label style={labelStyle}>EMAIL</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendLink()}
        placeholder="you@email.com"
        type="email"
        autoFocus
        style={inputStyle}
      />
      {error && <div style={errStyle}>{error}</div>}
      <button
        onClick={sendLink}
        disabled={busy}
        style={{ ...primaryBtn, marginTop: 12, opacity: busy ? 0.7 : 1 }}
      >
        {busy ? "Sending…" : "Email me a magic link"}
      </button>

      <div style={dividerRow}>
        <span style={dividerLine} />
        <span style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600 }}>or</span>
        <span style={dividerLine} />
      </div>

      <button onClick={() => signInWithGoogle("/studio")} style={googleBtn}>
        <GoogleGlyph /> Continue with Google
      </button>

      <p style={{ ...pStyle, fontSize: 12, textAlign: "center", marginTop: 18 }}>
        Just here to hang out?{" "}
        <Link href="/ananya" style={{ color: "var(--violet)", fontWeight: 700 }}>
          Explore a space
        </Link>
      </p>
    </div>
  );
}

/* ─────────────────────────── onboarding ─────────────────────────── */

function Onboarding({
  email,
  suggestedName,
  onCreated,
}: {
  email: string | null;
  suggestedName: string;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const { user } = useUser();

  const [name, setName] = useState(suggestedName || "");
  const [handle, setHandle] = useState(normalizeHandle(suggestedName || ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);

  const formatError = useMemo(
    () => (handle ? validateHandle(handle) : null),
    [handle],
  );

  // Debounced availability check.
  useEffect(() => {
    setAvailable(null);
    if (!handle || formatError) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("creators")
        .select("id")
        .eq("handle", handle)
        .maybeSingle();
      if (!cancelled) setAvailable(!data);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [handle, formatError, supabase]);

  async function create() {
    if (!user) return;
    const displayName = name.trim();
    if (displayName.length < 2) {
      setError("Add a display name (2+ characters).");
      return;
    }
    const fmt = validateHandle(handle);
    if (fmt) {
      setError(fmt);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data, error: insErr } = await supabase
        .from("creators")
        .insert({
          handle,
          display_name: displayName,
          owner_id: user.id,
          is_live: true,
        })
        .select()
        .single();
      if (insErr) {
        // 23505 = unique violation (handle taken, or user already has a space).
        if ((insErr as { code?: string }).code === "23505") {
          if (insErr.message.includes("handle")) {
            setError("That handle is already taken — try another.");
          } else {
            onCreated(); // they already own a space; show it
          }
          return;
        }
        throw insErr;
      }
      router.push(`/${(data as Creator).handle}`);
    } catch {
      setError("Couldn't create your space — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const handleState =
    formatError != null
      ? { text: formatError, color: "var(--red)" }
      : available === true
        ? { text: "✓ available", color: "var(--green)" }
        : available === false
          ? { text: "already taken", color: "var(--red)" }
          : handle.length >= HANDLE_MIN
            ? { text: "checking…", color: "var(--faint)" }
            : null;

  return (
    <div style={{ paddingTop: 18 }}>
      <h1 style={h1Style}>Name your space</h1>
      <p style={{ ...pStyle, marginBottom: 22 }}>
        {email ? (
          <>
            Signed in as <b style={{ color: "var(--ink)" }}>{email}</b>.{" "}
          </>
        ) : null}
        Pick how you&apos;ll appear and the link people will use.
      </p>

      <label style={labelStyle}>DISPLAY NAME</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Ananya"
        autoFocus
        style={inputStyle}
      />

      <label style={{ ...labelStyle, marginTop: 18 }}>YOUR LINK</label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: "1px solid var(--line2)",
          background: "var(--bg)",
          borderRadius: 14,
          padding: "0 14px",
          overflow: "hidden",
        }}
      >
        <span style={{ color: "var(--muted)", fontSize: 15, fontWeight: 600 }}>
          here…/
        </span>
        <input
          value={handle}
          onChange={(e) => setHandle(normalizeHandle(e.target.value))}
          placeholder="yourname"
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            background: "transparent",
            padding: "14px 6px",
            outline: "none",
            fontFamily: "var(--font-inter)",
            fontWeight: 700,
            fontSize: 16,
            color: "var(--ink)",
          }}
        />
        {handleState && (
          <span style={{ fontSize: 12, fontWeight: 700, color: handleState.color }}>
            {handleState.text}
          </span>
        )}
      </div>

      {error && <div style={errStyle}>{error}</div>}

      <button
        onClick={create}
        disabled={busy || available === false || !!formatError}
        style={{
          ...primaryBtn,
          marginTop: 20,
          opacity: busy || available === false || !!formatError ? 0.6 : 1,
        }}
      >
        {busy ? "Creating…" : "Create my space →"}
      </button>
    </div>
  );
}

/* ─────────────────────────── your space ─────────────────────────── */

function YourSpace({ creator }: { creator: Creator }) {
  const supabase = createClient();
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState(creator.theme ?? DEFAULT_THEME);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/${creator.handle}`
      : `/${creator.handle}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  async function saveTheme(id: string) {
    setTheme(id);
    await supabase.from("creators").update({ theme: id }).eq("id", creator.id);
  }

  return (
    <div style={{ ...themeVars(theme), paddingTop: 22 }}>
      <BigEmoji>🎉</BigEmoji>
      <h1 style={{ ...h1Style, textAlign: "center" }}>Your space is live</h1>
      <p style={{ ...pStyle, textAlign: "center", marginBottom: 20 }}>
        Share this link anywhere — anyone who opens it lands in{" "}
        <b style={{ color: "var(--ink)" }}>{creator.display_name}&apos;s Space</b> and
        can join a room in one tap.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: "1px solid var(--line2)",
          background: "var(--bg)",
          borderRadius: 14,
          padding: "12px 14px",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ink)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {url.replace(/^https?:\/\//, "")}
        </span>
        <button
          onClick={copy}
          style={{
            flex: "none",
            border: "none",
            cursor: "pointer",
            background: copied ? "var(--green)" : "var(--violet)",
            color: copied ? "#fff" : "var(--on-accent)",
            borderRadius: 10,
            padding: "9px 16px",
            fontWeight: 800,
            fontSize: 13.5,
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <Link href={`/${creator.handle}`} style={{ textDecoration: "none" }}>
        <div style={{ ...primaryBtn, textAlign: "center" }}>Go to my space →</div>
      </Link>

      {/* Theme picker */}
      <div style={{ marginTop: 26 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "var(--faint)",
            marginBottom: 10,
          }}
        >
          THEME
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => saveTheme(t.id)}
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
                    width: 24,
                    height: 24,
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
                {active && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="3" style={{ marginLeft: "auto", flex: "none" }}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 9 }}>
          Saved automatically — reload your space to see it.
        </div>
      </div>

      <div
        style={{
          marginTop: 22,
          padding: 16,
          border: "1px solid var(--line)",
          borderRadius: 16,
          background: "var(--card)",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>
          What you can do as the creator
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7 }}>
          <li>Open rooms with the <b style={{ color: "var(--ink)" }}>＋ New temporary room</b> button in your space</li>
          <li>Rooms can be permanent or auto-close on a timer</li>
          <li>Share your link above to invite people in</li>
        </ul>
      </div>
    </div>
  );
}

/* ─────────────────────────── shared bits ─────────────────────────── */

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        border: "3px solid var(--line2)",
        borderTopColor: "var(--violet)",
        animation: "spin .8s linear infinite",
      }}
    />
  );
}

function BigEmoji({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 44, textAlign: "center", marginBottom: 8 }}>{children}</div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.35 11.1H12v3.8h5.35c-.25 1.3-1 2.4-2.15 3.15v2.6h3.5c2.05-1.9 3.2-4.7 3.2-8 0-.6-.05-1.15-.15-1.75z" />
      <path
        d="M12 22c2.7 0 4.95-.9 6.6-2.35l-3.5-2.6c-.9.6-2.05.95-3.1.95-2.4 0-4.4-1.6-5.15-3.8H3.25v2.65C4.9 19.75 8.2 22 12 22z"
        opacity=".6"
      />
    </svg>
  );
}

const h1Style: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 26,
  letterSpacing: "-.02em",
  margin: "0 0 8px",
};
const h2Style: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 21,
  margin: "6px 0 8px",
};
const pStyle: React.CSSProperties = {
  color: "var(--muted)",
  fontSize: 14,
  lineHeight: 1.6,
  margin: 0,
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: ".08em",
  color: "var(--faint)",
  marginBottom: 8,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--line2)",
  background: "var(--bg)",
  borderRadius: 14,
  padding: "14px 16px",
  outline: "none",
  fontFamily: "var(--font-inter)",
  fontWeight: 600,
  fontSize: 16,
  color: "var(--ink)",
};
const primaryBtn: React.CSSProperties = {
  width: "100%",
  border: "none",
  cursor: "pointer",
  background: "var(--violet)",
  color: "var(--on-accent)",
  borderRadius: 14,
  padding: 15,
  fontWeight: 800,
  fontSize: 16,
  boxShadow: "0 12px 28px -8px rgba(124,58,237,.5)",
};
const ghostBtn: React.CSSProperties = {
  marginTop: 16,
  border: "1px solid var(--line2)",
  background: "var(--card)",
  color: "var(--ink)",
  borderRadius: 12,
  padding: "10px 16px",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};
const googleBtn: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  border: "1px solid var(--line2)",
  background: "var(--card)",
  color: "var(--ink)",
  borderRadius: 14,
  padding: 14,
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
};
const dividerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  margin: "18px 0",
};
const dividerLine: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: "var(--line2)",
};
const errStyle: React.CSSProperties = {
  marginTop: 10,
  color: "var(--red)",
  fontSize: 13,
  fontWeight: 600,
};
