---
name: media-embeds
description: Use when implementing media features — Spotify and YouTube oEmbed, Spotify Web API track picker (Instagram style), Giphy GIF picker, MediaRecorder voice notes, client-side compression, signed-URL uploads. Trigger keywords: spotify, youtube, embed, oembed, gif, giphy, voice, audio, video, upload, compression, media.
---

# Media & Embeds

Source of truth: `PROJECT_PLAN.md` §7.1 (médias, liens, embeds).

## oEmbed (keyless, free)

- **YouTube**: `https://www.youtube.com/oembed?url=<ENCODED_URL>&format=json` → extract `html` (iframe).
- **Spotify**: `https://open.spotify.com/oembed?url=<ENCODED_URL>` → `html` (iframe embed).
- Route through the `api/oembed` proxy to validate URLs and whitelist providers; return the iframe only for allowed hosts.

## Instagram-style Spotify picker

- Register a free Spotify App (Dashboard) → client id/secret (server-side).
- Search: `GET https://api.spotify.com/v1/search?q=...&type=track` → show results with album art + **30s preview URLs** for playback.
- On pick → resolve embed via oEmbed → store `music_embed` on the post.

## Giphy GIF picker

- Free Giphy SDK key; search UI in the editor toolbar; first tab = local curated retro GIFs (`public/gifs/`).

## Voice notes (MediaRecorder, no lib)

- `navigator.mediaDevices.getUserMedia({ audio: true })` → `MediaRecorder` → chunks → `audio/webm;codecs=opus` blob.
- UI: hold-to-record button, stop → preview → upload.
- Cap duration (e.g. 2 min) and size; upload via signed URL to `post-media`.

## Photos & videos (compression is mandatory — 1GB budget)

- Images: `browser-image-compression` before upload (max ~1.5MB, resize to ≤1600px).
- Videos: client-side transcode/resize (e.g. `ffmpeg.wasm` or similar free lib) to target 2–5MB/clip, max ~30–60s.
- Worst-case budget check: N friends × M posts × file size must fit 1GB (or move big videos to Cloudflare R2, 10GB free egress-free).

## Upload flow

- Client requests signed upload URL (`api/upload`) → uploads directly to Supabase Storage → stores path in `post_media.url` → post references media by id.
- No autoplay on embeds (browsers block it anyway; also keeps the surprise low-key).

## Verification

- Test each integration with real URLs (YouTube video, Spotify track & playlist) and confirm embed HTML.
- Verify compressed file sizes on phone browsers.
