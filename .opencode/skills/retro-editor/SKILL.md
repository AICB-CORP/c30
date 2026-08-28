---
name: retro-editor
description: Use when building or modifying the post editor (TipTap) or the raw HTML mode — toolbar extensions (fonts, colors, neon, marquee, blink), GIF picker, media insertion, sanitization with DOMPurify. Trigger keywords: editor, TipTap, rich text, HTML mode, DOMPurify, sanitize, toolbar.
---

# Retro Post Editor (TipTap + HTML mode)

Source of truth: `PROJECT_PLAN.md` §7.1 (personnalisation des posts).

## Stack

- **TipTap** (MIT, open source) for the rich text editor.
- **DOMPurify** for sanitization — the ONLY rendering path for user content. Never use `dangerouslySetInnerHTML` unsanitized.

## Toolbar spec (what the editor must offer)

1. Fonts (Google Fonts + Comic Sans MS fallback)
2. Text colors (full palette, incl. neon pink/purple/blue)
3. Neon toggle (`text-shadow` via inline style)
4. Marquee toggle
5. Blink toggle
6. Rainbow gradient text
7. Background color / tiled GIF background per post
8. GIF picker (local curated folder + Giphy search)
9. Media insertion: image, video, voice note, YouTube link, Spotify link
10. **"Mode HTML" toggle**: switch to raw HTML editing like the real Skyblog

## HTML mode & sanitization

- Allow toggling between visual mode and raw HTML textarea.
- Sanitize with DOMPurify using the whitelist from §7.1:
  - Tags: `font, marquee, blink, img, div, span, b, i, u, table, hr, center, p, br, a, h1-h3, ul, ol, li`
  - Inline styles: colors, `text-shadow`, `font-family`, `font-size`, `background`, `text-align`, `animation`.
- Sanitize TWICE: once before saving to DB (store sanitized HTML), once before rendering (defense in depth).
- Strip: `script`, `iframe` (except whitelisted embed patterns from oEmbed proxy), `on*` handlers, `javascript:` URLs, `<style>` blocks.
- Verify with XSS payload list: `<img src=x onerror=alert(1)>`, `<svg/onload=...>`, `javascript:alert(1)` in href, CSS `expression()`, `@import`.

## Data flow

- Editor produces HTML → sanitize → store `posts.content` (sanitized) → render → sanitize again client-side → display.
- `music_embed` stored separately (Spotify iframe from oEmbed, not user-pasted HTML).

## Verification

- `npx tsc --noEmit` + lint pass.
- Spot-check crafted malicious input renders inert (see payloads above).
