# Editor Retro Features & Image Upload Implementation (2026-08-31)

## Overview

Implemented several authentic 2000s-style features for the Skyblog editor, including multi-image uploads and specific retro text effects.

## Technical Implementation

### 1. Multi-Image Uploads

- **Logic**: Modified `MediaUpload.tsx` to handle multiple files. It iterates through selected files, compresses each using `browser-image-compression`, and uploads them to Cloudflare R2.
- **TipTap Integration**: Uses `@tiptap/extension-image`. Images are inserted sequentially into the editor.
- **Fix**: The hidden file input was not triggering on some browsers due to `display: none`. Fixed by using absolute positioning and `opacity: 0` to move it off-screen.

### 2. Retro Text Effects (TipTap Marks)

Implemented custom TipTap extensions in `components/editor/retroMarks.ts`:

- **Rainbow**: Applies a linear gradient animation to the text.
- **Marquee**: Wraps text in a `<marquee>` tag (preserving retro behavior).
- **Blink**: Applies a CSS animation that toggles opacity.
- **Blur**: Applies `filter: blur(6px)` and removes it on `:hover`.
- **Neon**: Applies multiple layers of `text-shadow` for a glowing effect.

### 3. 3D Toolbar UI

- **Aesthetic**: Buttons use `border-style: outset` when inactive and `inset` when active/clicked.
- **State Tracking**: The `RetroEditor` tracks the active formatting state (e.g., which alignment is selected) to ensure the button appears "pressed".
- **UX**: Labels and tooltips were translated to French to match the project's cultural context.

### 4. Hydration Fixes

- **BestOfPost**: Fixed a hydration mismatch error where the client and server generated different "random" posts. Moved the random selection logic into a `useEffect` hook to ensure it only runs on the client.

## Verifications

- **Visuals**: Verified via Playwright screenshots that the 3D buttons and retro effects render correctly across different viewports.
- **Functionality**: Verified that multiple images upload and appear in the editor without crashing.
