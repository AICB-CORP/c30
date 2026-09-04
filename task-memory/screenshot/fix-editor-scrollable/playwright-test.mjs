import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "."); // already in correct dir
const screenshotDir = path.resolve("task-memory/screenshot/fix-editor-scrollable");

// ensure dir
fs.mkdirSync(screenshotDir, { recursive: true });

/**
 * Inline CSS that mimics the essential Tailwind utilities + globals.css + RetroEditor styles.
 * We embed them so page.setContent renders without needing CDN.
 */
const inlineCss = `
  :root {
    --sky-pink: #ff69b4;
    --sky-hotpink: #ff1493;
    --sky-purple: #8b00ff;
    --sky-blue: #00bfff;
    --sky-black: #0d0011;
    --sky-white: #fff8fb;
    --font-retro-cursive: "Dancing Script", cursive;
  }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background: #0d0011; color: #fff8fb; font-family: "Comic Sans MS", cursive, sans-serif; }
  /* Tailwind mimic */
  .fixed { position: fixed; } .inset-0 { inset:0; } .z-50 { z-index:50; }
  .flex { display:flex; } .flex-col { flex-direction:column; } .flex-wrap { flex-wrap:wrap; }
  .items-center { align-items:center; } .justify-center { justify-content:center; } .justify-between{ justify-content:space-between; }
  .gap-1 { gap:0.25rem; } .gap-1\\.5 { gap:0.375rem; } .gap-2 { gap:0.5rem; } .gap-3 { gap:0.75rem; }
  .overflow-hidden { overflow:hidden; } .overflow-y-auto { overflow-y:auto; } .overflow-x-hidden { overflow-x:hidden; }
  .bg-black\\/80 { background: rgba(0,0,0,0.8); } .bg-black\\/60 { background: rgba(0,0,0,0.6); } .bg-black\\/40 { background: rgba(0,0,0,0.4); } .bg-black\\/20 { background: rgba(0,0,0,0.2); }
  .p-2 { padding:0.5rem; } .p-1 { padding:0.25rem; } .p-3 { padding:0.75rem; }
  .mb-2 { margin-bottom:0.5rem; } .mb-3 { margin-bottom:0.75rem; }
  .w-\\[95vw\\] { width:95vw; } .max-w-3xl { max-width:48rem; } .max-h-\\[90vh\\] { max-height:90vh; } .max-h-\\[45vh\\] { max-height:45vh; }
  .min-h-\\[180px\\] { min-height:180px; } .min-h-0 { min-height:0; } .flex-1 { flex:1 1 0%; }
  .w-full { width:100%; } .rounded-lg { border-radius:0.5rem; } .border-2 { border-width:2px; }
  .text-xs { font-size:0.75rem; } .text-sm { font-size:0.875rem; } .text-2xl { font-size:1.5rem; }
  .opacity-70 { opacity:0.7; } .opacity-80 { opacity:0.8; }
  .ml-auto { margin-left:auto; } .self-center { align-self:center; }
  .h-3 { height:0.75rem; } .w-3 { width:0.75rem; }
  @media (min-width: 768px) { .md\\:max-h-\\[50vh\\] { max-height:50vh; } }

  /* retro */
  .retro-box {
    background: linear-gradient(180deg, #2a0a3d 0%, #16042a 100%);
    border: 3px ridge #ff1493;
    border-radius: 12px;
    box-shadow: 0 0 12px rgba(255,20,147,0.45), inset 0 0 18px rgba(255,105,180,0.15);
    padding: 1rem;
  }
  .retro-title { font-family: var(--font-retro-cursive), "Dancing Script", cursive; font-size:2.2rem; text-shadow: 0 0 8px #ff1493, 0 0 16px #ff1493, 0 0 32px #8b00ff; color:#fff; }
  .neon-pink { color:#fff; text-shadow: 0 0 5px #ff69b4, 0 0 10px #ff69b4, 0 0 20px #ff1493, 0 0 40px #ff1493; }
  .retro-btn { display:inline-block; padding:0.5rem 1.25rem; border:3px outset #ffb6d9; border-radius:999px; background: linear-gradient(180deg, #ff1493, #a0005e); color:#fff; font-weight:bold; text-shadow:1px 1px 2px rgba(0,0,0,0.6); box-shadow:0 0 10px rgba(255,20,147,0.5); cursor:pointer; }
  .retro-btn:active { border-style: inset; } .retro-btn:disabled { opacity:0.5; cursor:not-allowed; }
  .retro-btn.tool-btn { padding:0.25rem 0.6rem; font-size:0.8rem; border:3px outset #ffb6d9; box-shadow:2px 2px 4px rgba(0,0,0,0.4), 0 0 8px rgba(255,20,147,0.3); transition:all 0.08s ease; }
  .retro-btn.tool-btn:active { border-style: inset; box-shadow:inset 2px 2px 4px rgba(0,0,0,0.4); transform: translateY(1px); }
  .retro-btn.tool-btn.pushed { border-style: inset; box-shadow:inset 2px 2px 6px rgba(0,0,0,0.5), inset 0 0 12px rgba(255,20,147,0.4); transform: translateY(1px); background: linear-gradient(180deg, #a0005e, #cc006a); }

  /* globals carousel */
  .retro-carousel {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    gap: 0.75rem;
    padding: 0.75rem;
    margin: 0.75rem 0;
    border: 3px ridge #ff69b4;
    border-radius: 12px;
    background: linear-gradient(180deg, #1a001a 0%, #0d0011 100%);
    box-shadow: 0 0 12px rgba(255,20,147,0.35), inset 0 0 18px rgba(255,105,180,0.12);
    scrollbar-width: thin;
    scrollbar-color: #ff69b4 #1a001a;
    max-width:100%; box-sizing:border-box;
  }
  .retro-carousel::-webkit-scrollbar { height:8px; }
  .retro-carousel::-webkit-scrollbar-track { background:#1a001a; border-radius:999px; }
  .retro-carousel::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #ff69b4, #a0005e); border-radius:999px; }
  .retro-carousel img {
    flex:0 0 auto;
    width: min(280px, 70vw);
    height: clamp(140px, 38vw, 200px);
    object-fit: cover;
    scroll-snap-align: start;
    border:2px solid #ff69b4;
    border-radius:8px;
    margin:0;
    box-shadow:0 0 8px rgba(255,105,180,0.5);
  }
  @media (max-width: 640px) {
    .retro-carousel { gap:0.5rem; padding:0.5rem; }
    .retro-title { font-size:1.6rem; }
    .retro-box { padding:0.75rem; }
  }

  /* editor area specifics from RetroEditor.tsx */
  .editor-area .tiptap .blur-text { filter: blur(6px); transition: filter 0.3s ease; cursor:pointer; }
  .editor-area .tiptap .blur-text:hover { filter: blur(0); }
  .editor-area .tiptap { min-height:180px; padding:0.75rem; outline:none; }
  .editor-area .tiptap p { margin:0.25rem 0; }
  .editor-area .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: rgba(255,255,255,0.4); float:left; height:0; pointer-events:none; }
  .editor-area .tiptap img { max-width:100%; border-radius:8px; }
  .editor-area .tiptap video, .editor-area .tiptap audio { max-width:100%; border-radius:8px; }
  .editor-area .tiptap .retro-carousel { /* already defined globally but duplicate as in file */ display:flex; overflow-x:auto; scroll-snap-type:x mandatory; gap:0.75rem; padding:0.75rem; margin:0.75rem 0; border:3px ridge #ff69b4; border-radius:12px; background: linear-gradient(180deg, #1a001a 0%, #0d0011 100%); max-width:100%; box-sizing:border-box; }
  .editor-area .tiptap .retro-carousel img { flex:0 0 auto; width: min(280px, 70vw); height: clamp(140px, 38vw, 200px); object-fit:cover; scroll-snap-align:start; border:2px solid #ff69b4; border-radius:8px; }
  @media (max-width:640px) { .editor-area .tiptap .retro-carousel { gap:0.5rem; padding:0.5rem; } }
  .editor-area .tiptap h1 { font-size:1.6em; font-weight:bold; margin:0.4em 0; }
  .editor-area .tiptap h2 { font-size:1.3em; font-weight:bold; margin:0.4em 0; }
  .editor-area .tiptap ul { list-style:disc; padding-left:1.4em; }
  .editor-area .tiptap ol { list-style:decimal; padding-left:1.4em; }
  .editor-area .tiptap a { color:#00bfff; text-decoration:underline; }

  /* small helpers */
  .title-input { width:100%; border-radius:0.5rem; border:2px solid #ff69b4; background: rgba(0,0,0,0.6); padding:0.5rem 0.75rem; color:white; outline:none; }
  .toolbar-box { border-radius:0.5rem; border:2px solid rgba(255,105,180,0.6); background: rgba(0,0,0,0.4); padding:0.5rem; }
  .media-row { display:flex; flex-wrap:wrap; gap:0.375rem; }
`;

function svgDataUri(color, w = 280, h = 200, text = "img") {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><rect width='100%' height='100%' fill='${color}'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='white'>${text}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const colors = [
  "#ff69b4",
  "#8b00ff",
  "#00bfff",
  "#ffd700",
  "#00ff88",
  "#ff1493",
  "#ff8c00",
  "#a02cff",
  "#00ffaa",
  "#ff4081",
];

function editorHtml({ many = false, carousel = false, count = 10 }) {
  // Build inner tiptap content
  let imagesHtml = "";
  let carouselHtml = "";
  if (many) {
    if (carousel) {
      const imgs = Array.from(
        { length: count },
        (_, i) =>
          `<img src="${svgDataUri(colors[i % colors.length], 280, 200, `photo ${i + 1}`)}" alt="">`,
      ).join("");
      carouselHtml = `<div class="retro-carousel" data-carousel="true">${imgs}</div>`;
      // add some text before/after to force vertical overflow
      imagesHtml = `<p>Voici mes photos pref avec Caroline ★ (carrousel ${count} images) — le texte doit scroller mais le bouton Publier reste visible !</p>${carouselHtml}<p>C'était une super soirée, on a dansé jusqu'à 4h du mat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt.</p>`;
      // add more images outside carousel to increase vertical overflow further
      imagesHtml += Array.from(
        { length: 6 },
        (_, i) =>
          `<img src="${svgDataUri(colors[(i + 3) % colors.length], 400, 250, `extra ${i + 1}`)}" alt="">`,
      ).join("");
      imagesHtml += `<p>Encore du texte pour pousser la hauteur au delà de 45vh et forcer le scroll. Ligne 1<br/>Ligne 2<br/>Ligne 3<br/>Ligne 4<br/>Ligne 5</p>`;
    } else {
      // many standalone images stacked vertically, no carousel
      imagesHtml = `<p>10 photos en vrac (sans carrousel) — le conteneur doit scroller, pas la page.</p>`;
      imagesHtml += Array.from(
        { length: count },
        (_, i) =>
          `<img src="${svgDataUri(colors[i % colors.length], 400, 220, `img ${i + 1}`)}" alt="">`,
      ).join("");
      imagesHtml += `<p>Fin du post — le bouton Publier doit rester accessible sans scroller la page.</p>`;
    }
  } else {
    imagesHtml = `<p>Raconte ta meilleure histoire avec elle… (2004 vibes)</p>`;
  }

  // Full modal html mimicking RetroEditor.tsx render
  return `
  <!DOCTYPE html>
  <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${inlineCss}</style></head>
  <body>
    <div class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/80 p-2" data-testid="modal-outer">
      <div class="retro-box flex w-[95vw] max-w-3xl max-h-[90vh] flex-col overflow-hidden" data-testid="retro-box">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 class="neon-pink retro-title text-2xl">✏️ Nouveau post</h3>
          <button type="button" class="text-sm opacity-70" style="background:none;border:none;color:white;cursor:pointer;">✖ Fermer</button>
        </div>
        <input type="text" placeholder="Titre de ton post…" class="title-input mb-3" value="" />
        <div class="mb-3 flex gap-2">
          <button type="button" class="retro-btn tool-btn active">🌍 Public</button>
          <button type="button" class="retro-btn tool-btn">🔒 Privé</button>
          <span class="ml-auto self-center text-xs opacity-70">Privé = visible seulement par la destinataire</span>
        </div>
        <div class="mb-2 toolbar-box">
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" class="retro-btn tool-btn" data-testid="tool-bold">B</button>
            <button type="button" class="retro-btn tool-btn" data-testid="tool-italic">I</button>
            <button type="button" class="retro-btn tool-btn">U</button>
            <button type="button" class="retro-btn tool-btn">S</button>
            <button type="button" class="retro-btn tool-btn">H1</button>
            <button type="button" class="retro-btn tool-btn">H2</button>
            <button type="button" class="retro-btn tool-btn">• Liste</button>
            <button type="button" class="retro-btn tool-btn">1. Liste</button>
            <span class="mx-1 h-6 w-px" style="width:1px;height:24px;background:rgba(255,105,180,0.5);margin:0 4px;"></span>
            <input type="color" value="#FF69B4" class="h-7 w-9" style="height:28px;width:36px;cursor:pointer;border:2px solid #ffb6d9;background:transparent;">
            <button type="button" style="height:20px;width:20px;border-radius:999px;background:#FF69B4;border:1px solid rgba(255,255,255,0.5);"></button>
            <button type="button" style="height:20px;width:20px;border-radius:999px;background:#8B00FF;border:1px solid rgba(255,255,255,0.5);"></button>
            <button type="button" style="height:20px;width:20px;border-radius:999px;background:#00BFFF;border:1px solid rgba(255,255,255,0.5);"></button>
            <select class="retro-btn tool-btn"><option>Police</option><option>Comic Sans MS</option></select>
            <select class="retro-btn tool-btn"><option>Taille</option><option>16px</option></select>
            <span class="mx-1 h-6 w-px" style="width:1px;height:24px;background:rgba(255,105,180,0.5);margin:0 4px;"></span>
            <button type="button" class="retro-btn tool-btn">⬅</button>
            <button type="button" class="retro-btn tool-btn">⬌</button>
            <button type="button" class="retro-btn tool-btn">➡</button>
            <span class="mx-1 h-6 w-px" style="width:1px;height:24px;background:rgba(255,105,180,0.5);margin:0 4px;"></span>
            <button type="button" class="retro-btn tool-btn">🔗</button>
            <button type="button" class="retro-btn tool-btn">🎵</button>
            <button type="button" class="retro-btn tool-btn">▶️</button>
            <span class="mx-1 h-6 w-px" style="width:1px;height:24px;background:rgba(255,105,180,0.5);margin:0 4px;"></span>
            <div class="flex flex-wrap items-center gap-1">
              <button type="button" class="retro-btn tool-btn">⚡ Néon</button>
              <button type="button" class="retro-btn tool-btn">✨ Arc-en-ciel</button>
              <button type="button" class="retro-btn tool-btn">📜 Défilant</button>
              <button type="button" class="retro-btn tool-btn">💫 Clignotant</button>
              <button type="button" class="retro-btn tool-btn">🔍 Flou</button>
            </div>
            <button type="button" class="retro-btn tool-btn">⚙️ HTML</button>
          </div>
        </div>
        <div class="mb-2 flex flex-wrap gap-1.5">
          <div class="flex items-center gap-1.5">
            <button type="button" class="retro-btn tool-btn">🖼️ Photos</button>
            <label class="flex items-center gap-1 text-xs opacity-80"><input type="checkbox" checked class="h-3 w-3" style="accent-color:#ff69b4;"> Carrousel</label>
          </div>
          <button type="button" class="retro-btn tool-btn">🎬 Vidéo</button>
          <button type="button" class="retro-btn tool-btn">🎵 Son</button>
          <button type="button" class="retro-btn tool-btn">💬 GIF</button>
          <button type="button" class="retro-btn tool-btn">🎙 Voix</button>
        </div>

        <div class="editor-area mb-2 flex min-h-[180px] flex-1 flex-col overflow-hidden rounded-lg" style="border:2px solid rgba(255,105,180,0.3); background: rgba(0,0,0,0.2);" data-testid="editor-area">
          <div class="max-h-[45vh] min-h-[180px] flex-1 overflow-y-auto overflow-x-hidden p-1 md:max-h-[50vh]" data-testid="editor-scroll">
            <div class="tiptap prose-retro" data-testid="tiptap">
              ${imagesHtml}
            </div>
          </div>
        </div>

        <div class="flex gap-2" data-testid="publish-row">
          <button type="button" class="retro-btn" data-testid="publish-btn">💾 Publier</button>
          <button type="button" class="retro-btn">Annuler</button>
        </div>
      </div>
    </div>
  </body></html>
  `;
}

async function runOne({ viewport, name, html }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: "load" });
  // small wait for fonts/layout
  await page.waitForTimeout(300);

  // Evaluate layout metrics
  const metrics = await page.evaluate(() => {
    const outer = document.querySelector('[data-testid="modal-outer"]');
    const box = document.querySelector('[data-testid="retro-box"]');
    const scroll = document.querySelector('[data-testid="editor-scroll"]');
    const area = document.querySelector('[data-testid="editor-area"]');
    const publishBtn = document.querySelector('[data-testid="publish-btn"]');
    const tiptap = document.querySelector('[data-testid="tiptap"]');
    const publishRow = document.querySelector('[data-testid="publish-row"]');
    const carousel = document.querySelector(".retro-carousel");
    const carouselImgs = carousel ? Array.from(carousel.querySelectorAll("img")) : [];
    const toolBtns = Array.from(document.querySelectorAll(".retro-btn.tool-btn"));
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const docScrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    function rect(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        top: r.top,
        left: r.left,
        right: r.right,
        bottom: r.bottom,
      };
    }
    const outerRect = rect(outer);
    const boxRect = rect(box);
    const scrollRect = rect(scroll);
    const areaRect = rect(area);
    const publishRect = rect(publishBtn);
    const publishRowRect = rect(publishRow);
    const tiptapRect = rect(tiptap);
    const carouselRect = carousel ? rect(carousel) : null;
    // getComputedStyle for key elements
    const boxStyle = box ? getComputedStyle(box) : null;
    const scrollStyle = scroll ? getComputedStyle(scroll) : null;
    const outerStyle = outer ? getComputedStyle(outer) : null;
    // measure scrollHeight vs clientHeight
    const scrollHeight = scroll ? scroll.scrollHeight : null;
    const clientHeight = scroll ? scroll.clientHeight : null;
    const hasVerticalScrollbar =
      scrollHeight !== null && clientHeight !== null ? scrollHeight > clientHeight + 1 : false;
    // carousel image computed widths
    const imgMetrics = carouselImgs.map((img) => {
      const r = rect(img);
      const cs = getComputedStyle(img);
      return {
        width: r.width,
        height: r.height,
        computedWidth: cs.width,
        computedHeight: cs.height,
        scrollSnapAlign: cs.scrollSnapAlign,
        objectFit: cs.objectFit,
      };
    });
    // toolBtn sizes
    const toolMetrics = toolBtns.map((b) => {
      const r = rect(b);
      return { w: r.width, h: r.height, text: b.textContent?.trim().slice(0, 20) };
    });
    // check overflow
    const pageScrollY = window.scrollY;
    const pageScrollX = window.scrollX;
    // Check if publish button is in viewport (fully visible)
    const publishInViewport = publishRect
      ? publishRect.top >= 0 &&
        publishRect.bottom <= vh &&
        publishRect.left >= 0 &&
        publishRect.right <= vw
      : false;
    const publishVisible = publishBtn
      ? publishBtn.offsetParent !== null &&
        publishRect &&
        publishRect.width > 0 &&
        publishRect.height > 0
      : false;
    // Check if outer has overflow hidden
    const outerOverflow = outerStyle ? outerStyle.overflow : null;
    const boxOverflow = boxStyle ? boxStyle.overflow : null;
    const boxFlexDirection = boxStyle ? boxStyle.flexDirection : null;
    const boxMaxHeight = boxStyle ? boxStyle.maxHeight : null;
    const scrollMaxHeight = scrollStyle ? scrollStyle.maxHeight : null;
    const scrollOverflowY = scrollStyle ? scrollStyle.overflowY : null;
    const scrollOverflowX = scrollStyle ? scrollStyle.overflowX : null;
    return {
      vw,
      vh,
      docScrollWidth,
      bodyScrollWidth,
      outerRect,
      boxRect,
      scrollRect,
      areaRect,
      publishRect,
      publishRowRect,
      tiptapRect,
      carouselRect,
      scrollHeight,
      clientHeight,
      hasVerticalScrollbar,
      imgMetrics,
      toolMetrics,
      pageScrollY,
      pageScrollX,
      publishInViewport,
      publishVisible,
      outerOverflow,
      boxOverflow,
      boxFlexDirection,
      boxMaxHeight,
      scrollMaxHeight,
      scrollOverflowY,
      scrollOverflowX,
      outerStyleOverflow: outerStyle ? outerStyle.overflow : null,
      boxStyle: {
        overflow: boxStyle?.overflow,
        maxHeight: boxStyle?.maxHeight,
        flexDirection: boxStyle?.flexDirection,
        display: boxStyle?.display,
      },
      scrollStyle: {
        overflowY: scrollStyle?.overflowY,
        overflowX: scrollStyle?.overflowX,
        maxHeight: scrollStyle?.maxHeight,
      },
    };
  });

  // Take screenshot
  const fileName = `${name}.png`;
  const filePath = path.join(screenshotDir, fileName);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`Screenshot saved: ${filePath} for viewport ${viewport.width}x${viewport.height}`);

  // Also for many images case, test scrolling behavior: scroll the inner container to bottom and verify publish still visible
  let afterScrollMetrics = null;
  if (name.includes("many-images")) {
    // scroll inner container to bottom
    await page.evaluate(() => {
      const scroll = document.querySelector('[data-testid="editor-scroll"]');
      if (scroll) scroll.scrollTop = scroll.scrollHeight;
    });
    await page.waitForTimeout(200);
    afterScrollMetrics = await page.evaluate(() => {
      const publishBtn = document.querySelector('[data-testid="publish-btn"]');
      const scroll = document.querySelector('[data-testid="editor-scroll"]');
      const r = publishBtn.getBoundingClientRect();
      const sr = scroll.getBoundingClientRect();
      return {
        publishRect: {
          top: r.top,
          bottom: r.bottom,
          left: r.left,
          right: r.right,
          width: r.width,
          height: r.height,
        },
        scrollTop: scroll.scrollTop,
        scrollHeight: scroll.scrollHeight,
        clientHeight: scroll.clientHeight,
        publishInViewport: r.top >= 0 && r.bottom <= window.innerHeight,
      };
    });
    // Take second screenshot after scroll? Instead capture one with scrolled state overwritten?
    const scrolledFile = filePath.replace(".png", "-scrolled.png");
    await page.screenshot({ path: scrolledFile, fullPage: false });
    console.log(`Scrolled screenshot saved: ${scrolledFile}`);
  }

  await browser.close();
  return { metrics, afterScrollMetrics, screenshot: fileName };
}

async function main() {
  console.log("Starting Playwright layout tests for fix/editor-scrollable");
  console.log("Screenshot dir:", screenshotDir);
  const desktopViewport = { width: 1280, height: 800 };
  const mobileViewport = { width: 375, height: 812 };

  const results = {};

  // Editor empty
  results.emptyDesktop = await runOne({
    viewport: desktopViewport,
    name: "editor-empty-desktop",
    html: editorHtml({ many: false }),
  });
  results.emptyMobile = await runOne({
    viewport: mobileViewport,
    name: "editor-empty-mobile",
    html: editorHtml({ many: false }),
  });
  // Many images with carousel (10 images)
  results.manyDesktop = await runOne({
    viewport: desktopViewport,
    name: "editor-many-images-desktop",
    html: editorHtml({ many: true, carousel: true, count: 10 }),
  });
  results.manyMobile = await runOne({
    viewport: mobileViewport,
    name: "editor-many-images-mobile",
    html: editorHtml({ many: true, carousel: true, count: 10 }),
  });
  // Additional: many images without carousel (stacked)
  results.manyStackedMobile = await runOne({
    viewport: mobileViewport,
    name: "editor-many-stacked-mobile",
    html: editorHtml({ many: true, carousel: false, count: 10 }),
  });
  results.manyStackedDesktop = await runOne({
    viewport: desktopViewport,
    name: "editor-many-stacked-desktop",
    html: editorHtml({ many: true, carousel: false, count: 10 }),
  });

  // Summary evaluation output for report
  const summary = {
    generatedAt: new Date().toISOString(),
    viewports: { desktop: desktopViewport, mobile: mobileViewport },
    results,
  };
  const summaryPath = path.join(screenshotDir, "metrics.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log("Metrics written to", summaryPath);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
