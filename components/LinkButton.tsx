"use client";

import type { CreatorLink } from "@/lib/types";
import { buttonStyle, type ResolvedAppearance } from "@/lib/appearance";
import { track } from "@/lib/posthog";

/**
 * A single link-in-bio button on the public space page, styled from the
 * creator's resolved appearance (shape / fill / colour / shadow).
 */
export function LinkButton({
  link,
  appearance,
}: {
  link: CreatorLink;
  appearance: ResolvedAppearance;
}) {
  const base = buttonStyle(appearance);
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={() => track("link_clicked", { link_id: link.id })}
      style={{
        ...base,
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 52,
        padding: "13px 16px",
        textDecoration: "none",
        fontSize: 15,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 30,
          flex: "none",
          textAlign: "center",
          fontSize: 19,
          lineHeight: 1,
        }}
      >
        {link.icon || "🔗"}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontWeight: 700,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {link.title}
      </span>
      <span aria-hidden style={{ opacity: 0.5, fontSize: 18, flex: "none" }}>
        ›
      </span>
    </a>
  );
}
