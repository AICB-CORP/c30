---
name: skyblog-aesthetic
description: Use when implementing or reviewing anything visual for the retro 2000s Skyblog look — neon text, marquee, blink, rainbow gradient, glitter GIFs, retro fonts, skins, odometer hit counter, countdown widgets, confetti. Trigger keywords: design, aesthetic, retro, skin, theme, marquee, neon, glitter, fonts, couleurs.
---

# Skyblog Aesthetic

Source of truth: `PROJECT_PLAN.md` §8. Core principle: **authenticity over polish** — the retro maximalism IS the gift.

## Design tokens

- Colors: Skyrock pink `#FF69B4`, black `#000`, purple `#8B00FF`, electric blue `#00BFFF`.
- Fonts (Google Fonts): `Dancing Script` (cursive titles), `Press Start 2P` (pixel counters), fallback `Comic Sans MS` for authentic cringe.
- Textures: tiled animated-GIF backgrounds, sparkle cursor (`cursor: url(sparkle.gif), auto`).

## CSS recipes

- **Neon text**: layered `text-shadow`:
  ```css
  .neon {
    color: #fff;
    text-shadow:
      0 0 5px #ff69b4,
      0 0 10px #ff69b4,
      0 0 20px #ff1493,
      0 0 40px #ff1493;
  }
  ```
- **Marquee** (native `<marquee>` is deprecated but still rendered — prefer CSS):
  ```css
  @keyframes marquee {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(-100%);
    }
  }
  .marquee {
    display: block;
    white-space: nowrap;
    animation: marquee 12s linear infinite;
  }
  ```
- **Blink**: `@keyframes blink { 50% { opacity: 0; } }`.
- **Rainbow text**: `background: linear-gradient(...); -webkit-background-clip: text; color: transparent;`.
- **Odometer counter**: fixed-width digit cells with `Press Start 2P`, background flip on change.

## GIFs

- Curate a local folder (`public/gifs/`) of era-authentic GIFs: glitter stars, hearts, butterflies, sparkly dividers, flame bars, sparkle dividers.
- Giphy search is the endless supply in the post editor picker.

## Mobile-first rules

- Retro effects must survive small screens: media queries, `overflow-wrap` for marquee text, min tap targets (~44px), no horizontal scroll caused by fixed-width retro elements.
- Test at 375px and 768px before finishing any visual work.

## Widgets

- Hit counter: odometer digits, fake-but-fun visitor count.
- Countdown: flip-card animation "J-30 avant les 30 ans".
- Coups de cœur: heart GIF burst on click.

## Accessibility minimums

- Text readable unless intentionally decorative; contrast checked for every user-pickable skin; interactive elements reachable.
