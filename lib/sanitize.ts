import DOMPurify from "dompurify";
import type { Config } from "dompurify";

export const HTML_TAGS = [
  "font",
  "marquee",
  "blink",
  "img",
  "div",
  "span",
  "b",
  "i",
  "u",
  "s",
  "table",
  "tbody",
  "tr",
  "td",
  "th",
  "hr",
  "center",
  "p",
  "br",
  "a",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "strong",
  "em",
  "video",
  "audio",
  "iframe",
] as const;

const GLOBAL_ATTRS = ["style", "class", "align", "title", "width", "height"];

const ATTRS_BY_TAG: Record<string, readonly string[]> = {
  img: [...GLOBAL_ATTRS, "src", "alt"],
  a: [...GLOBAL_ATTRS, "href", "target", "rel"],
  font: [...GLOBAL_ATTRS, "color", "size", "face"],
  video: [...GLOBAL_ATTRS, "src", "controls"],
  audio: [...GLOBAL_ATTRS, "src", "controls"],
  iframe: [...GLOBAL_ATTRS, "src", "allow", "allowfullscreen"],
};

export const HTML_ATTRS = [
  ...new Set([
    ...GLOBAL_ATTRS,
    "src",
    "alt",
    "href",
    "target",
    "rel",
    "color",
    "size",
    "face",
    "controls",
    "allow",
    "allowfullscreen",
  ]),
];

export const HTML_STYLES = [
  "color",
  "background",
  "background-color",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "text-decoration",
  "text-shadow",
  "text-align",
  "line-height",
  "letter-spacing",
  "animation",
  "animation-name",
  "animation-duration",
  "animation-iteration-count",
  "border",
  "border-radius",
  "padding",
  "margin",
  "float",
  "width",
  "height",
  "display",
];

const SAFE_IFRAME_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "spotify.com",
  "open.spotify.com",
]);

const URI_REGEXP = /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS: [...HTML_TAGS],
  ALLOWED_ATTR: HTML_ATTRS,
  ALLOWED_URI_REGEXP: URI_REGEXP,
  FORBID_ATTR: ["srcdoc", "formaction", "xlink:href"],
  KEEP_CONTENT: true,
};

const DANGEROUS_CSS = /url\s*\(|expression|@import|-moz-binding|javascript\s*:|behavior\s*:/i;

function sanitizeStyleAttr(value: string): string {
  const kept: string[] = [];
  for (const part of value.split(";")) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const prop = part.slice(0, colon).trim().toLowerCase();
    const val = part.slice(colon + 1).trim();
    if (!HTML_STYLES.includes(prop)) continue;
    if (DANGEROUS_CSS.test(val)) continue;
    if (prop === "display" && !["inline", "block", "inline-block"].includes(val)) continue;
    kept.push(`${prop}: ${val}`);
  }
  return kept.join("; ");
}

const purify = typeof window !== "undefined" ? DOMPurify : null;

if (purify) {
  purify.addHook("afterSanitizeAttributes", (node) => {
    const tag = node.tagName.toLowerCase();
    const allowed = ATTRS_BY_TAG[tag] ?? GLOBAL_ATTRS;
    for (const attr of Array.from(node.attributes)) {
      if (!allowed.includes(attr.name)) {
        node.removeAttribute(attr.name);
      }
    }
    const style = node.getAttribute("style");
    if (style) {
      const clean = sanitizeStyleAttr(style);
      if (clean) node.setAttribute("style", clean);
      else node.removeAttribute("style");
    }
    if (tag === "a") {
      const href = node.getAttribute("href");
      if (href && !/^(?:https?:|mailto:)/i.test(href)) {
        node.removeAttribute("href");
      }
      if (node.getAttribute("target") === "_blank") {
        node.setAttribute("rel", "noopener noreferrer");
      }
    }
    if (tag === "iframe") {
      const src = node.getAttribute("src");
      let host = "";
      try {
        host = new URL(src ?? "").hostname;
      } catch {
        host = "";
      }
      if (!SAFE_IFRAME_HOSTS.has(host.toLowerCase())) {
        node.remove();
      }
    }
  });
}

const STRIPPED_TAGS =
  "object|embed|svg|math|form|input|button|link|meta|style|base|template|noscript|noembed|noframes";

function decodeEntities(s: string): string {
  return s.replace(/&#(x[0-9a-f]+|\d+);/gi, (raw, ent: string) => {
    const code = ent[0].toLowerCase() === "x" ? parseInt(ent.slice(1), 16) : parseInt(ent, 10);
    return code >= 1 && code <= 0x7f ? String.fromCharCode(code) : raw;
  });
}

function fallbackSanitizeHtml(html: string): string {
  return decodeEntities(String(html))
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*\/?\s*script\b[^>]*>/gi, "")
    .replace(new RegExp(`<\\s*\\/?\\s*(?:${STRIPPED_TAGS})\\b[^>]*>`, "gi"), "")
    .replace(/([\s/])on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "$1")
    .replace(
      /\s(?:href|src|xlink:href)\s*=\s*["']?(?:javascript|data|vbscript)\s*:[^"'\s>]*["']?/gi,
      "",
    )
    .replace(/([\s"'=])javascript\s*:/gi, "$1")
    .replace(
      /<a\b(?![^>]*\brel\s*=)([^>]*\btarget\s*=\s*["']_blank["'][^>]*)>/gi,
      '<a rel="noopener noreferrer"$1>',
    );
}

export function sanitizeHtml(html: string): string {
  const input = String(html ?? "");
  if (!purify) return fallbackSanitizeHtml(input);
  return purify.sanitize(input, SANITIZE_CONFIG);
}

export function sanitizeText(text: string): string {
  return String(text ?? "").replace(/<[^>]*>/g, "");
}

function extractIframeSrc(html: string): string | null {
  if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(String(html), "text/html");
    const iframe = doc.querySelector("iframe");
    return iframe?.getAttribute("src") ?? null;
  }
  const match = /<\s*iframe\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(
    String(html),
  );
  return match ? (match[1] ?? match[2] ?? match[3]) : null;
}

export function isSafeIframe(html: string): boolean {
  const src = extractIframeSrc(html);
  if (!src) return false;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  if (!/^https?:$/i.test(url.protocol)) return false;
  return SAFE_IFRAME_HOSTS.has(url.hostname.toLowerCase());
}
