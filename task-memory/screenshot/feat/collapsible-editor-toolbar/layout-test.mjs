/**
 * layout-test.mjs — ROUND 3 — FINAL verification of fixes on feat/collapsible-editor-toolbar
 * ---------------------------------------------------------------------------
 * Fixes under test (round 3):
 *  F2-v2 (was remaining IMPORTANT): toolbar region className now
 *      … max-md:mt-2 max-md:max-h-[calc(42vh-80px)] max-md:overflow-y-auto
 *    → the 80px subtracts the sticky chrome (handle ~51 + mt-2 8 + padding 16 +
 *      border 4) so the WHOLE sticky block is guaranteed ≤ 42vh on mobile.
 *  Boundary nit fix: component <style> mobile rule now
 *      @media (max-width: 767.98px)   (aligned with Tailwind v4 md boundary)
 *    and useCollapsibleToolbar MOBILE_QUERY is now "(max-width: 767.98px)".
 *
 * Fidelity (unchanged): Tailwind utilities in @layer utilities; retro globals +
 * component <style> unlayered; hook simulated verbatim incl. the 767.98px query.
 *
 * Run: node layout-test.mjs
 */

import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const npmRoot = execSync("npm root -g").toString().trim();
const { chromium } = await import(
  pathToFileURL(path.join(npmRoot, "playwright", "index.mjs")).href
);

const outDir = path.resolve("task-memory/screenshot/feat/collapsible-editor-toolbar");
fs.mkdirSync(outDir, { recursive: true });

/* =========================================================================
 * CSS — REAL cascade structure, synced with the CURRENT component source
 * ========================================================================= */
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
  html, body { margin:0; padding:0; background:#0d0011; color:#fff8fb;
    font-family: "Comic Sans MS", cursive, sans-serif; }

  @layer utilities {
    .fixed{position:fixed}.inset-0{inset:0}.z-50{z-index:50}
    .flex{display:flex}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}
    .items-center{align-items:center}.justify-center{justify-content:center}
    .justify-between{justify-content:space-between}
    .gap-1{gap:0.25rem}.gap-1\\.5{gap:0.375rem}.gap-2{gap:0.5rem}
    .overflow-hidden{overflow:hidden}.overflow-y-auto{overflow-y:auto}
    .bg-black\\/80{background:rgba(0,0,0,.8)}.bg-black\\/60{background:rgba(0,0,0,.6)}
    .bg-black\\/40{background:rgba(0,0,0,.4)}.bg-black\\/20{background:rgba(0,0,0,.2)}
    .bg-transparent{background:transparent}
    .p-0{padding:0}.p-1{padding:0.25rem}.p-2{padding:0.5rem}
    .px-3{padding-left:0.75rem;padding-right:0.75rem}.py-2{padding-top:0.5rem;padding-bottom:0.5rem}
    .pr-1{padding-right:0.25rem}.pt-3{padding-top:0.75rem}
    .mb-2{margin-bottom:0.5rem}.mb-3{margin-bottom:0.75rem}.mx-1{margin-left:0.25rem;margin-right:0.25rem}
    .ml-auto{margin-left:auto}.self-center{align-self:center}
    .w-full{width:100%}.w-px{width:1px}
    .h-3{height:0.75rem}.h-5{height:1.25rem}.h-6{height:1.5rem}.h-7{height:1.75rem}
    .w-3{width:0.75rem}.w-5{width:1.25rem}.w-9{width:2.25rem}
    .w-\\[95vw\\]{width:95vw}.max-w-3xl{max-width:48rem}.max-h-\\[90vh\\]{max-height:90vh}
    .min-h-0{min-height:0}.min-h-\\[280px\\]{min-height:280px}
    .flex-1{flex:1 1 0%}.flex-shrink-0{flex-shrink:0}
    .rounded-lg{border-radius:0.5rem}.rounded-full{border-radius:9999px}
    .border{border-width:1px;border-style:solid}.border-2{border-width:2px;border-style:solid}
    .border-t{border-top-width:1px;border-top-style:solid}
    .border-\\[\\#ff69b4\\]{border-color:#ff69b4}
    .border-\\[\\#ff69b4\\]\\/60{border-color:rgba(255,105,180,.6)}
    .border-\\[\\#ff69b4\\]\\/30{border-color:rgba(255,105,180,.3)}
    .border-\\[\\#ff69b4\\]\\/20{border-color:rgba(255,105,180,.2)}
    .border-\\[\\#ffb6d9\\]{border-color:#ffb6d9}
    .border-white\\/50{border-color:rgba(255,255,255,.5)}
    .bg-\\[\\#ff69b4\\]\\/50{background-color:rgba(255,105,180,.5)}
    .text-white{color:#fff}.text-2xl{font-size:1.5rem;line-height:2rem}
    .text-sm{font-size:0.875rem}.text-xs{font-size:0.75rem}
    .opacity-70{opacity:.7}.opacity-80{opacity:.8}.hover\\:opacity-100:hover{opacity:1}
    .cursor-pointer{cursor:pointer}.outline-none{outline:none}
    .placeholder\\:text-white\\/40::placeholder{color:rgba(255,255,255,.4)}
    .accent-\\[\\#ff69b4\\]{accent-color:#ff69b4}
    .sticky{position:sticky}.top-0{top:0}.z-10{z-index:10}
    .backdrop-blur-sm{backdrop-filter:blur(4px)}
    .font-bold{font-weight:700}.italic{font-style:italic}.underline{text-decoration:underline}
    .line-through{text-decoration:line-through}
    @media (max-width: 767.98px) {
      .max-md\\:mt-2 { margin-top: 0.5rem; }
      .max-md\\:max-h-\\[calc\\(42vh-80px\\)\\] { max-height: calc(42vh - 80px); }
      .max-md\\:overflow-y-auto { overflow-y: auto; }
    }
    @media (min-width: 768px) { .md\\:hidden { display: none; } }
  }

  /* ---- retro globals from app/globals.css — UNLAYERED ---- */
  .retro-box {
    background: linear-gradient(180deg, #2a0a3d 0%, #16042a 100%);
    border: 3px ridge var(--sky-hotpink);
    border-radius: 12px;
    box-shadow: 0 0 12px rgba(255, 20, 147, 0.45), inset 0 0 18px rgba(255, 105, 180, 0.15);
    padding: 1rem;
  }
  .retro-title {
    font-family: var(--font-retro-cursive), "Dancing Script", cursive;
    font-size: 2.2rem;
    text-shadow: 0 0 8px var(--sky-hotpink), 0 0 16px var(--sky-hotpink), 0 0 32px var(--sky-purple);
    color: #fff;
  }
  .neon-pink {
    color: #fff;
    text-shadow: 0 0 5px var(--sky-pink), 0 0 10px var(--sky-pink), 0 0 20px var(--sky-hotpink), 0 0 40px var(--sky-hotpink);
  }
  .retro-btn {
    display: inline-block;
    padding: 0.5rem 1.25rem;
    border: 3px outset #ffb6d9;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--sky-hotpink), #a0005e);
    color: #fff;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
    box-shadow: 0 0 10px rgba(255, 20, 147, 0.5);
    cursor: pointer;
  }
  .retro-btn:active { border-style: inset; }
  .retro-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  @media (max-width: 640px) {
    .retro-title { font-size: 1.6rem; }
    .retro-box { padding: 0.75rem; }
  }

  /* ---- component <style> block — CURRENT SOURCE, UNLAYERED ---- */
  .retro-btn.tool-btn {
    padding: 0.25rem 0.6rem;
    font-size: 0.8rem;
    border: 3px outset #ffb6d9;
    box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4), 0 0 8px rgba(255, 20, 147, 0.3);
    transition: all 0.08s ease;
    white-space: nowrap;
  }
  .retro-btn.tool-btn:active {
    border-style: inset;
    box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.4);
    transform: translateY(1px);
  }
  .retro-btn.tool-btn.pushed {
    border-style: inset;
    box-shadow: inset 2px 2px 6px rgba(0, 0, 0, 0.5), inset 0 0 12px rgba(255, 20, 147, 0.4);
    transform: translateY(1px);
    background: linear-gradient(180deg, #a0005e, #cc006a);
  }
  /* 767.98px boundary — aligned with Tailwind v4 md */
  @media (max-width: 767.98px) {
    .retro-btn.tool-btn.styles-handle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 0.65rem 0.75rem;
      font-size: 0.9rem;
    }
  }
  @media (min-width: 768px) {
    .retro-btn.tool-btn.styles-handle {
      display: none;
    }
  }
  .editor-area .tiptap {
    min-height: 180px;
    padding: 0.75rem;
    outline: none;
  }
  .editor-area .tiptap p { margin: 0.25rem 0; }
  .editor-area .tiptap img { max-width: 100%; border-radius: 8px; }
  .editor-area .tiptap h1 { font-size: 1.6em; font-weight: bold; margin: 0.4em 0; }
  .editor-area .tiptap h2 { font-size: 1.3em; font-weight: bold; margin: 0.4em 0; }
`;

/* =========================================================================
 * Toolbar region markup — CURRENT className (calc(42vh-80px) cap)
 * ========================================================================= */
const TOOLBAR_REGION_HTML = `
<div id="retro-style-toolbar" role="region" aria-label="Barre d&#39;outils de mise en page"
     class="flex flex-wrap items-center gap-1.5 max-md:mt-2 max-md:max-h-[calc(42vh-80px)] max-md:overflow-y-auto" data-testid="style-toolbar">
  <button type="button" class="retro-btn tool-btn font-bold" title="Gras" data-testid="tool-bold">B</button>
  <button type="button" class="retro-btn tool-btn italic" title="Italique">I</button>
  <button type="button" class="retro-btn tool-btn underline" title="Souligné">U</button>
  <button type="button" class="retro-btn tool-btn line-through" title="Barré">S</button>
  <button type="button" class="retro-btn tool-btn" title="Titre 1">H1</button>
  <button type="button" class="retro-btn tool-btn" title="Titre 2">H2</button>
  <button type="button" class="retro-btn tool-btn" title="Liste">• Liste</button>
  <button type="button" class="retro-btn tool-btn" title="Liste numérotée">1. Liste</button>
  <span class="mx-1 h-6 w-px bg-[#ff69b4]/50"></span>
  <input type="color" title="Couleur du texte" value="#FF69B4"
         class="h-7 w-9 cursor-pointer border-2 border-[#ffb6d9] bg-transparent p-0">
  <button type="button" title="#FF69B4" class="h-5 w-5 rounded-full border border-white/50" style="background-color:#FF69B4"></button>
  <button type="button" title="#8B00FF" class="h-5 w-5 rounded-full border border-white/50" style="background-color:#8B00FF"></button>
  <button type="button" title="#00BFFF" class="h-5 w-5 rounded-full border border-white/50" style="background-color:#00BFFF"></button>
  <button type="button" title="#FFD700" class="h-5 w-5 rounded-full border border-white/50" style="background-color:#FFD700"></button>
  <button type="button" title="#00FF88" class="h-5 w-5 rounded-full border border-white/50" style="background-color:#00FF88"></button>
  <button type="button" title="#FFFFFF" class="h-5 w-5 rounded-full border border-white/50" style="background-color:#FFFFFF"></button>
  <select title="Police" class="retro-btn tool-btn" data-testid="tool-font">
    <option value="">Police</option><option>Comic Sans MS</option><option>Dancing Script</option>
    <option>Courier New</option><option>Georgia</option><option>Arial</option>
  </select>
  <select title="Taille du texte" class="retro-btn tool-btn" data-testid="tool-size">
    <option value="">Taille</option><option>10px</option><option>12px</option><option>14px</option>
    <option>16px</option><option>18px</option><option>20px</option><option>24px</option><option>28px</option>
  </select>
  <span class="mx-1 h-6 w-px bg-[#ff69b4]/50"></span>
  <button type="button" class="retro-btn tool-btn" title="Aligné à gauche">⬅</button>
  <button type="button" class="retro-btn tool-btn" title="Centré">⬌</button>
  <button type="button" class="retro-btn tool-btn" title="Aligné à droite">➡</button>
  <span class="mx-1 h-6 w-px bg-[#ff69b4]/50"></span>
  <button type="button" class="retro-btn tool-btn" title="Lien" data-testid="tool-link">🔗</button>
  <button type="button" class="retro-btn tool-btn" title="Musique (Spotify…)">🎵</button>
  <button type="button" class="retro-btn tool-btn" title="Vidéo YouTube">▶️</button>
  <span class="mx-1 h-6 w-px bg-[#ff69b4]/50"></span>
  <div class="flex flex-wrap items-center gap-1">
    <button type="button" class="retro-btn tool-btn" title="Néon — donne un effet lumineux néon rose au texte" data-testid="tool-neon">⚡ Néon</button>
    <button type="button" class="retro-btn tool-btn" title="Arc-en-ciel — le texte défile dans toutes les couleurs" data-testid="tool-rainbow">✨ Arc-en-ciel</button>
    <button type="button" class="retro-btn tool-btn" title="Défilant — le texte défile de droite à gauche" data-testid="tool-marquee">📜 Défilant</button>
    <button type="button" class="retro-btn tool-btn" title="Clignotant — le texte clignote comme un vieux site web" data-testid="tool-blink">💫 Clignotant</button>
    <button type="button" class="retro-btn tool-btn" title="Flou — le texte est caché, survole pour révéler le message secret" data-testid="tool-blur">🔍 Flou</button>
  </div>
  <button type="button" class="retro-btn tool-btn" title="Mode HTML" data-testid="tool-html">⚙️ HTML</button>
</div>`;

/* =========================================================================
 * Full page
 * ========================================================================= */
function pageHtml() {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${inlineCss}</style></head>
<body>
<div class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/80 p-2" data-testid="modal-outer">
  <div class="retro-box flex w-[95vw] max-w-3xl max-h-[90vh] flex-col overflow-hidden" data-testid="retro-box">

    <div class="flex-shrink-0">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 class="neon-pink retro-title text-2xl">✏️ Nouveau post</h3>
        <button type="button" class="text-sm opacity-70 hover:opacity-100" data-testid="close-btn">✖ Fermer</button>
      </div>
      <input type="text" placeholder="Titre de ton post…"
             class="mb-3 w-full rounded-lg border-2 border-[#ff69b4] bg-black/60 px-3 py-2 text-white outline-none placeholder:text-white/40"
             data-testid="title-input">
      <div class="mb-3 flex gap-2">
        <button type="button" class="retro-btn tool-btn active">🌍 Public</button>
        <button type="button" class="retro-btn tool-btn">🔒 Privé</button>
        <span class="ml-auto self-center text-xs opacity-70">Privé = visible seulement par la destinataire</span>
      </div>
    </div>

    <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1" data-testid="middle-scroll">
      <div class="sticky top-0 z-10 flex-shrink-0 rounded-lg border-2 border-[#ff69b4]/60 bg-black/40 p-2 backdrop-blur-sm"
           id="toolbar-sticky" data-testid="toolbar-sticky">
        <button type="button" class="retro-btn tool-btn styles-handle md:hidden"
                title="Afficher ou masquer la barre de styles" aria-expanded="true"
                aria-controls="retro-style-toolbar" id="styles-handle" data-testid="styles-handle">🎨 Styles ▼</button>
      </div>

      <div class="mb-2 flex flex-wrap gap-1.5" data-testid="media-row">
        <div class="flex items-center gap-1.5">
          <button type="button" class="retro-btn tool-btn" title="Ajouter des photos/vidéos">🖼️ Photos</button>
          <label class="flex items-center gap-1 text-xs opacity-80" title="Groupe les photos en carrousel quand tu en sélectionnes plusieurs">
            <input type="checkbox" checked class="h-3 w-3 accent-[#ff69b4]"> Carrousel
          </label>
        </div>
        <button type="button" class="retro-btn tool-btn" title="Ajouter une vidéo">🎬 Vidéo</button>
        <button type="button" class="retro-btn tool-btn" title="Ajouter un son">🎵 Son</button>
        <button type="button" class="retro-btn tool-btn" data-testid="gif-btn">💬 GIF</button>
        <button type="button" class="retro-btn tool-btn" data-testid="voice-btn">🎙 Voix</button>
      </div>

      <div class="editor-area mb-2 flex min-h-[280px] flex-col rounded-lg border-2 border-[#ff69b4]/30 bg-black/20 p-2" data-testid="editor-area">
        <div class="tiptap prose-retro" contenteditable="true" data-testid="tiptap">
          <p>Raconte ta meilleure histoire avec elle… (2004 vibes)</p>
        </div>
      </div>
    </div>

    <div class="flex flex-shrink-0 gap-2 border-t border-[#ff69b4]/20 pt-3" data-testid="footer">
      <button type="button" class="retro-btn" data-testid="publish-btn">💾 Publier</button>
      <button type="button" class="retro-btn" data-testid="cancel-btn">Annuler</button>
    </div>
  </div>
</div>

<script>
/* useCollapsibleToolbar simulation — CURRENT hook (MOBILE_QUERY 767.98px). */
(function () {
  const TOOLBAR_GUARD_MS = 800;
  const MOBILE_QUERY = "(max-width: 767.98px)";
  const REGION_HTML = ${JSON.stringify(TOOLBAR_REGION_HTML)};
  let toolbarOpen = true;
  let isMobile = false;
  let lastTouch = 0;

  const handle = document.getElementById("styles-handle");
  const sticky = document.getElementById("toolbar-sticky");
  const tiptap = document.querySelector('[data-testid="tiptap"]');

  function render() {
    handle.textContent = toolbarOpen ? "🎨 Styles ▲" : "🎨 Styles ▼";
    handle.setAttribute("aria-expanded", String(toolbarOpen));
    const existing = document.getElementById("retro-style-toolbar");
    if (toolbarOpen && !existing) {
      const wrap = document.createElement("div");
      wrap.innerHTML = REGION_HTML.trim();
      handle.after(wrap.firstChild);
    } else if (!toolbarOpen && existing) {
      existing.remove();
    }
  }

  const mql = window.matchMedia(MOBILE_QUERY);
  function apply(mobile) { isMobile = mobile; toolbarOpen = !mobile; render(); }
  mql.addEventListener("change", (e) => apply(e.matches));
  apply(mql.matches);

  handle.addEventListener("mousedown", (e) => e.preventDefault());
  handle.addEventListener("click", () => { toolbarOpen = !toolbarOpen; render(); });
  sticky.addEventListener("pointerdown", () => { lastTouch = Date.now(); });
  tiptap.addEventListener("focus", () => {
    if (isMobile && Date.now() - lastTouch > TOOLBAR_GUARD_MS) {
      toolbarOpen = false; render();
    }
  });

  window.__test = {
    get state() { return { toolbarOpen, isMobile, msSinceToolbarTouch: Date.now() - lastTouch }; },
    blurEditor() { tiptap.blur(); },
  };

  window.__measure = function (step) {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1),
               right: +r.right.toFixed(1), width: +r.width.toFixed(1), height: +r.height.toFixed(1) };
    };
    const q = (s) => document.querySelector(s);
    const vw = window.innerWidth, vh = window.innerHeight;
    const box = q('[data-testid="retro-box"]');
    const handle = q('[data-testid="styles-handle"]');
    const region = q("#retro-style-toolbar");
    const sticky = q('[data-testid="toolbar-sticky"]');
    const middle = q('[data-testid="middle-scroll"]');
    const editorArea = q('[data-testid="editor-area"]');
    const publish = q('[data-testid="publish-btn"]');
    const mediaRow = q('[data-testid="media-row"]');

    const boxRect = rect(box), handleRect = rect(handle), regionRect = rect(region),
          stickyRect = rect(sticky), middleRect = rect(middle),
          editorRect = rect(editorArea), publishRect = rect(publish);

    const inViewport = (r) => !!r && r.top >= -0.5 && r.bottom <= vh + 0.5 && r.left >= -0.5 && r.right <= vw + 0.5;
    const insideBox = (r) => !!r && !!boxRect && r.left >= boxRect.left - 0.5 && r.right <= boxRect.right + 0.5
                            && r.top >= boxRect.top - 0.5 && r.bottom <= boxRect.bottom + 0.5;
    const visibleH = (r) => r ? Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) : 0;

    const hcs = handle ? getComputedStyle(handle) : null;
    const handleStyle = hcs ? {
      display: hcs.display, backgroundImage: hcs.backgroundImage,
      borderTopStyle: hcs.borderTopStyle, borderTopWidth: hcs.borderTopWidth,
      borderRadius: hcs.borderRadius, fontWeight: hcs.fontWeight,
    } : null;

    const regionComputed = region ? (() => {
      const c = getComputedStyle(region);
      return { maxHeight: c.maxHeight, overflowY: c.overflowY,
               scrollHeight: region.scrollHeight, clientHeight: region.clientHeight };
    })() : null;

    return {
      step, vw, vh,
      state: window.__test.state,
      handleText: handle ? handle.textContent : null,
      ariaExpanded: handle ? handle.getAttribute("aria-expanded") : null,
      docScrollWidth: document.documentElement.scrollWidth,
      box: boxRect, handle: handleRect, region: regionRect, sticky: stickyRect,
      middle: middleRect, editorArea: editorRect, publish: publishRect,
      middleScrollTop: middle.scrollTop,
      middleScrollHeight: middle.scrollHeight, middleClientHeight: middle.clientHeight,
      handleInViewport: inViewport(handleRect), handleInsideBox: insideBox(handleRect),
      publishInViewport: inViewport(publishRect), publishInsideBox: insideBox(publishRect),
      editorAreaHeight: editorRect ? editorRect.height : null,
      editorVisibleHeight: +visibleH(editorRect).toFixed(1),
      publishVisibleHeight: +visibleH(publishRect).toFixed(1),
      regionPresent: !!region,
      regionButtons: region ? region.querySelectorAll("button").length : 0,
      regionSelects: region ? region.querySelectorAll("select").length : 0,
      regionComputed, handleStyle,
    };
  };
})();
</script>
</body></html>`;
}

/* =========================================================================
 * Helpers
 * ========================================================================= */
const checks = [];
const findings = [];
function observe(sev, name, detail) {
  findings.push({ severity: sev, name, detail });
  console.log(`  ℹ️  FINDING(${sev}) — ${name}  [${detail}]`);
}
function assert(name, cond, detail) {
  checks.push({ name, pass: !!cond, detail: detail ?? "" });
  console.log(`  ${cond ? "PASS" : "FAIL"} — ${name}${detail ? "  [" + detail + "]" : ""}`);
  return !!cond;
}
const px = (n) => (n == null ? "?" : Math.round(n) + "px");

async function shot(page, file) {
  await page.screenshot({ path: path.join(outDir, file) });
  console.log(`  📸 ${file}`);
}

/** Scroll the middle to reveal the editor below the sticky block, and return
 *  the best tap point in the visible band (or none). Works in a page or frame. */
async function revealAndFindTap(target, sel) {
  const has = (exp) => target.evaluate ? target : target.page;
  await target.evaluate((s) => {
    const el = document.querySelector(s);
    const m = document.querySelector('[data-testid="middle-scroll"]');
    const sticky = document.querySelector('[data-testid="toolbar-sticky"]');
    const mr = m.getBoundingClientRect(), er = el.getBoundingClientRect(),
          sr = sticky.getBoundingClientRect();
    const stickyBottomOffset = sr.bottom - mr.top;
    const elementTopInScroll = er.top - mr.top + m.scrollTop;
    const wanted = elementTopInScroll - stickyBottomOffset - 12;
    m.scrollTop = Math.max(0, Math.min(wanted, m.scrollHeight - m.clientHeight));
  }, sel);
  await new Promise((r) => setTimeout(r, 60));
  return target.evaluate((s) => {
    const el = document.querySelector(s);
    const r = el.getBoundingClientRect();
    const sticky = document.querySelector('[data-testid="toolbar-sticky"]').getBoundingClientRect();
    const middle = document.querySelector('[data-testid="middle-scroll"]').getBoundingClientRect();
    const top = Math.max(r.top, sticky.bottom + 6);
    const bottom = Math.min(r.bottom, middle.bottom - 6, window.innerHeight - 4);
    const band = bottom - top;
    if (band < 8) return { none: true, band: +band.toFixed(1),
      stickyBottom: +sticky.bottom.toFixed(1), middleBottom: +middle.bottom.toFixed(1),
      elTop: +r.top.toFixed(1) };
    const x = Math.min(Math.max(r.left + 24, 8), window.innerWidth - 8);
    return { x: +x.toFixed(1), y: +((top + bottom) / 2).toFixed(1), band: +band.toFixed(1) };
  }, sel);
}

/** Draw a tap-indicator marker at a point (screenshot aid; pointer-events:none). */
async function markTap(page, pt) {
  await page.evaluate((p) => {
    const m = document.createElement("div");
    m.id = "tap-marker";
    m.style.cssText = `position:fixed;left:${p.x - 11}px;top:${p.y - 11}px;width:22px;height:22px;` +
      `border:3px dashed #00ff88;border-radius:50%;pointer-events:none;z-index:999;` +
      `box-shadow:0 0 10px #00ff88, inset 0 0 6px #00ff88;`;
    document.body.appendChild(m);
  }, pt);
}

/* =========================================================================
 * Shared mobile end-to-end scenario: collapsed → expand (cap checks) →
 * tap editor band → focus auto-collapse → win; optional guard + scrolled.
 * ========================================================================= */
async function mobileFlow(browser, { width, height, tag, guard = false, scrolledShot = false, expandShotWithMarker = true }) {
  console.log(`\n=== MOBILE ${width}×${height} (${tag}) — end-to-end ===`);
  const context = await browser.newContext({
    viewport: { width, height }, hasTouch: true, isMobile: true,
  });
  const page = await context.newPage();
  await page.setContent(pageHtml(), { waitUntil: "load" });
  await page.waitForTimeout(250);
  const capExpected = 0.42 * height - 80;
  const M = {};

  /* 1. collapsed default — regression checks */
  M.collapsed = await page.evaluate((s) => window.__measure(s), `1-collapsed-${tag}`);
  assert(`${tag}: starts COLLAPSED`, M.collapsed.state.toolbarOpen === false && !M.collapsed.regionPresent);
  assert(`${tag}: handle ≥44px, full width, visible`,
    M.collapsed.handleInViewport && M.collapsed.handle.height >= 44 &&
    Math.abs(M.collapsed.handle.width - (M.collapsed.sticky.width - 20)) <= 1.5,
    `${px(M.collapsed.handle.width)}×${px(M.collapsed.handle.height)}`);
  assert(`${tag}: handle label '🎨 Styles ▼' + aria-expanded=false`,
    M.collapsed.handleText === "🎨 Styles ▼" && M.collapsed.ariaExpanded === "false");
  assert(`${tag}: editor visible when collapsed (≥250px — win preserved)`,
    M.collapsed.editorVisibleHeight >= 250, px(M.collapsed.editorVisibleHeight));
  assert(`${tag}: 💾 Publier visible + no overflow`,
    M.collapsed.publishInViewport && M.collapsed.docScrollWidth <= width,
    `doc=${M.collapsed.docScrollWidth}`);
  await shot(page, `editor-collapsed-${tag}-r3.png`);

  /* 2. expand → cap checks */
  await page.click('[data-testid="styles-handle"]');
  await page.waitForTimeout(150);
  M.expanded = await page.evaluate((s) => window.__measure(s), `2-expanded-${tag}`);
  assert(`${tag}: expanded — 26 buttons / 2 selects`,
    M.expanded.regionPresent && M.expanded.regionButtons === 26 && M.expanded.regionSelects === 2);
  assert(`${tag}: region max-height computes calc(42vh−80px) = ${px(capExpected)}`,
    Math.abs(parseFloat(M.expanded.regionComputed.maxHeight) - capExpected) <= 2,
    `maxHeight=${M.expanded.regionComputed.maxHeight}`);
  assert(`${tag}: region CLAMPED to cap with internal scrollbar`,
    Math.abs(M.expanded.region.height - capExpected) <= 2 &&
    M.expanded.regionComputed.overflowY === "auto" &&
    M.expanded.regionComputed.scrollHeight > M.expanded.regionComputed.clientHeight + 1,
    `region=${px(M.expanded.region.height)}, scrollHeight=${M.expanded.regionComputed.scrollHeight} > client=${M.expanded.regionComputed.clientHeight}`);
  const bandRest = +(M.expanded.middle.bottom - M.expanded.sticky.bottom).toFixed(1);
  M.bandRest = bandRest;
  console.log(`  ℹ️  space below sticky (at scrollTop=0): ${bandRest}px — this is where the media row sits; the editor enters it after a small swipe`);
  assert(`${tag}: sticky block ≤ middle scrollport (editor reachable by scroll)`,
    M.expanded.sticky.height <= M.expanded.middle.height,
    `sticky=${px(M.expanded.sticky.height)} ≤ middle=${px(M.expanded.middle.height)}`);
  assert(`${tag}: 💾 Publier visible while expanded + no overflow`,
    M.expanded.publishInViewport && M.expanded.docScrollWidth <= width);

  /* 3. end-to-end: tap editor band → focus → auto-collapse */
  await page.waitForTimeout(900); // guard expiry since handle tap
  const pt = await revealAndFindTap(page, '[data-testid="tiptap"]');
  M.tapBand = pt.band;
  if (expandShotWithMarker && !pt.none) { await markTap(page, pt); }
  await shot(page, `editor-expanded-${tag}-r3.png`);
  if (pt.none) {
    assert(`${tag}: editor band tappable → auto-collapse reachable`, false,
      `band=${pt.band}px (${pt.detail ?? ""})`);
  } else {
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(120);
    M.autocollapsed = await page.evaluate((s) => window.__measure(s), `3-autocollapse-${tag}`);
    assert(`${tag}: editor band tappable (band=${pt.band}px) → focus fires AUTO-COLLAPSE`,
      M.autocollapsed.state.toolbarOpen === false && !M.autocollapsed.regionPresent,
      `msSinceToolbarTouch=${M.autocollapsed.state.msSinceToolbarTouch}`);
    const winH = +(M.autocollapsed.editorVisibleHeight - M.expanded.editorVisibleHeight).toFixed(1);
    M.screenSpaceWin = winH;
    assert(`${tag}: screen-space win ≥ 150px`, winH >= 150,
      `Δ=${px(winH)} (${px(M.expanded.editorVisibleHeight)} → ${px(M.autocollapsed.editorVisibleHeight)})`);
    await shot(page, `editor-autocollapse-${tag}-r3.png`);
  }

  /* 3b. sticky handle while scrolled (clip nit check) */
  const isOpen = await page.evaluate(() => window.__test.state.toolbarOpen);
  if (!isOpen) await page.click('[data-testid="styles-handle"]');
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    const m = document.querySelector('[data-testid="middle-scroll"]');
    m.scrollTop = m.scrollHeight;
  });
  await page.waitForTimeout(120);
  M.scrolled = await page.evaluate((s) => window.__measure(s), `3b-scrolled-${tag}`);
  assert(`${tag}: handle sticky & fully visible while scrolled (R1-4 clip nit resolved)`,
    M.scrolled.handleInViewport && M.scrolled.handle.top >= M.scrolled.middle.top - 1.5,
    `handle.top=${M.scrolled.handle?.top} ≥ middle.top=${M.scrolled.middle?.top}−1.5`);
  if (scrolledShot) await shot(page, `editor-expanded-scrolled-${tag}-r3.png`);

  /* 4. optional guard flow */
  if (guard) {
    await page.evaluate(() => {
      document.querySelector('[data-testid="middle-scroll"]').scrollTop = 0;
    });
    const open2 = await page.evaluate(() => window.__test.state.toolbarOpen);
    if (!open2) await page.click('[data-testid="styles-handle"]');
    await page.waitForTimeout(100);
    if (!(await page.evaluate(() => !!document.getElementById("retro-style-toolbar"))))
      throw new Error("region not mounted before guard test");
    await page.click('[data-testid="tool-bold"]');
    const ptB = await revealAndFindTap(page, '[data-testid="tiptap"]');
    await page.mouse.click(ptB.x, ptB.y);
    await page.waitForTimeout(100);
    M.guardHold = await page.evaluate((s) => window.__measure(s), `4a-guard-${tag}`);
    assert(`${tag}: B tap + immediate text tap → toolbar STAYS open (guard < 800ms)`,
      M.guardHold.state.toolbarOpen === true && M.guardHold.regionPresent,
      `msSinceToolbarTouch=${M.guardHold.state.msSinceToolbarTouch}`);
    await shot(page, `editor-guard-stays-open-${tag}-r3.png`);
    await page.evaluate(() => window.__test.blurEditor());
    await page.waitForTimeout(900);
    const ptC = await revealAndFindTap(page, '[data-testid="tiptap"]');
    await page.mouse.click(ptC.x, ptC.y);
    await page.waitForTimeout(100);
    M.guardExpire = await page.evaluate((s) => window.__measure(s), `4b-guard-expire-${tag}`);
    assert(`${tag}: after 900ms → text tap collapses`,
      M.guardExpire.state.toolbarOpen === false && !M.guardExpire.regionPresent,
      `msSinceToolbarTouch=${M.guardExpire.state.msSinceToolbarTouch}`);
    await shot(page, `editor-guard-expires-${tag}-r3.png`);
  }

  /* 5. instant collapse + retro look quick check */
  const open3 = await page.evaluate(() => window.__test.state.toolbarOpen);
  if (!open3) await page.click('[data-testid="styles-handle"]');
  await page.waitForTimeout(80);
  const timing = await page.evaluate(() => {
    const h = document.querySelector('[data-testid="styles-handle"]');
    const t0 = performance.now();
    h.click();
    return { unmountMs: +(performance.now() - t0).toFixed(2),
             gone: !document.getElementById("retro-style-toolbar") };
  });
  assert(`${tag}: collapse INSTANT (<16ms)`, timing.gone && timing.unmountMs < 16, `${timing.unmountMs}ms`);
  const hs = M.expanded.handleStyle;
  assert(`${tag}: handle retro look intact`, /linear-gradient/.test(hs.backgroundImage) &&
    hs.borderTopStyle === "outset" && hs.borderRadius === "999px" && hs.fontWeight === "700");

  await context.close();
  return M;
}

/* =========================================================================
 * Boundary tests — 767.5px (fractional), 767px, 768px
 * ========================================================================= */
async function boundaryChecks(browser) {
  console.log("\n=== BOUNDARY 767.5 / 767 / 768 ===");
  const results = {};

  /* 767 and 768 — integer viewports, direct */
  for (const w of [767, 768]) {
    const context = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await context.newPage();
    await page.setContent(pageHtml(), { waitUntil: "load" });
    await page.waitForTimeout(200);
    const M = await page.evaluate((s) => window.__measure(s), `bp-${w}`);
    results[w] = M;
    if (w === 767) {
      assert("767px: handle styled MOBILE (flex, full-width ≥80% of sticky box)",
        M.handleStyle.display === "flex" && M.handle.width >= 0.8 * M.sticky.width && M.handleInViewport,
        `display=${M.handleStyle.display}, ${px(M.handle.width)} of ${px(M.sticky.width)}`);
      assert("767px: mobile behaviour — toolbar collapsed by default",
        M.state.isMobile === true && M.state.toolbarOpen === false && !M.regionPresent);
      await shot(page, "boundary-767-r3.png");
    } else {
      assert("768px: handle display:none, zero box, desktop open",
        M.handleStyle.display === "none" && M.handle.width === 0 && M.handle.height === 0 &&
        M.state.toolbarOpen === true && M.regionPresent,
        `display=${M.handleStyle.display}, box=${M.handle.width}×${M.handle.height}`);
      await shot(page, "boundary-768-r3.png");
    }
    await context.close();
  }

  /* 767.5px — fractional width. Playwright viewport may floor it; fall back to
     an iframe of exactly 767.5px inside an 800px page (matchMedia inside the
     iframe sees the iframe width — same-origin srcdoc). */
  let method = "fractional-viewport";
  let page, target, clip = null;
  const context = await browser.newContext({ viewport: { width: 800, height: 900 } });
  page = await context.newPage();
  try {
    const probe = await browser.newContext({ viewport: { width: 767.5, height: 900 } });
    const ppage = await probe.newPage();
    await ppage.setContent("<body>x</body>");
    const iw = await ppage.evaluate(() => window.innerWidth);
    if (iw === 767.5) {
      await probe.close();
      const direct = await browser.newContext({ viewport: { width: 767.5, height: 900 } });
      page = (await direct.newPage());
      await page.setContent(pageHtml(), { waitUntil: "load" });
      target = page;
      method = "fractional-viewport";
      await context.close();
    } else {
      await probe.close();
      throw new Error("fractional floored: " + iw);
    }
  } catch {
    // iframe fallback
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;background:#000">
      <iframe id="f" style="border:0;width:767.5px;height:900px;display:block"></iframe></body></html>`);
    await page.evaluate((h) => { document.getElementById("f").srcdoc = h; }, pageHtml());
    await page.waitForTimeout(450);
    target = page.frames().find((f) => f !== page.mainFrame());
    clip = await page.evaluate(() => {
      const r = document.getElementById("f").getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    method = "iframe-767.5px";
  }
  const M = await target.evaluate((s) => window.__measure(s), "bp-767.5");
  results["767.5"] = { ...M, method };
  /* The nit fix aligns ALL boundaries at 767.98/768 (component CSS, hook,
     Tailwind max-md / md) — the promise is CONSISTENCY: the rules can never
     disagree again (no stray inline-block pill + hook/CSS on the same side).
     Chromium rounds the fractional media viewport (767.5 → 768) while layout
     stays fractional, so here every rule co-decides "desktop" — that is the
     fixed behaviour. A 767px / 768px bracket proves the mobile side too. */
  const sameSide = M.state.isMobile ? M.handleStyle.display === "flex" : M.handleStyle.display === "none";
  assert("767.5px: component CSS and hook AGREE (same side, no stray inline-block pill)",
    sameSide && M.handleStyle.display !== "inline-block",
    `isMobile=${M.state.isMobile}, display=${M.handleStyle.display}, toolbarOpen=${M.state.toolbarOpen} [${method}; layout stayed fractional: sticky=${px(M.sticky.width)}]`);
  assert("767.5px: toolbarOpen consistent with the hook's side",
    M.state.isMobile ? M.state.toolbarOpen === false : M.state.toolbarOpen === true,
    `isMobile=${M.state.isMobile}, toolbarOpen=${M.state.toolbarOpen}`);
  if (clip) {
    await page.screenshot({ path: path.join(outDir, "boundary-767.5-r3.png"), clip });
    console.log("  📸 boundary-767.5-r3.png");
  } else {
    await shot(page, "boundary-767.5-r3.png");
  }
  const c2 = page.context();
  await c2.close();
  // close any leftover contexts opened by the fractional attempt
  for (const ctx of browser.contexts()) if (ctx !== c2) { try { await ctx.close(); } catch {} }
  return results;
}

/* =========================================================================
 * Desktop 1280×800 — must remain unregressed
 * ========================================================================= */
async function desktop(browser) {
  console.log("\n=== DESKTOP 1280×800 — regression sweep ===");
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.setContent(pageHtml(), { waitUntil: "load" });
  await page.waitForTimeout(250);
  const M = {};

  M.default = await page.evaluate((s) => window.__measure(s), "desktop-default");
  assert("desktop: toolbar OPEN by default, 26 buttons + 2 selects",
    M.default.state.toolbarOpen === true && M.default.regionPresent &&
    M.default.regionButtons === 26 && M.default.regionSelects === 2);
  assert("desktop: handle display:none + zero box",
    M.default.handleStyle.display === "none" && M.default.handle.width === 0 && M.default.handle.height === 0,
    `display=${M.default.handleStyle.display}, box=${M.default.handle.width}×${M.default.handle.height}`);
  const clickCheck = await page.evaluate(() => {
    const handle = document.querySelector('[data-testid="styles-handle"]');
    const region = document.getElementById("retro-style-toolbar");
    const rr = region.getBoundingClientRect();
    const elAt = document.elementFromPoint(rr.left + rr.width / 2, rr.top + 20);
    return { elIsHandle: elAt === handle || handle.contains(elAt), elTag: elAt?.tagName };
  });
  assert("desktop: handle NOT clickable", !clickCheck.elIsHandle,
    `element at position: <${clickCheck.elTag}>`);
  assert("desktop: NO cap (max-height:none, overflow visible) — wraps like old layout",
    M.default.regionComputed.maxHeight === "none" && M.default.regionComputed.overflowY === "visible",
    `maxHeight=${M.default.regionComputed.maxHeight}, region=${px(M.default.region.height)} (round 1/2: 111px)`);
  assert("desktop: 💾 Publier visible, no overflow",
    M.default.publishInViewport && M.default.publishInsideBox && M.default.docScrollWidth <= 1280);
  await shot(page, "editor-desktop-unchanged-r3.png");
  await context.close();
  return M;
}

/* =========================================================================
 * Main
 * ========================================================================= */
function savePartial(partial) {
  fs.writeFileSync(path.join(outDir, "metrics-partial.json"), JSON.stringify(partial, null, 2));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const partial = { generatedAt: new Date().toISOString(), branch: "feat/collapsible-editor-toolbar", round: 3 };

  const m667 = await mobileFlow(browser, { width: 375, height: 667, tag: "667", scrolledShot: false });
  partial.mobile667 = m667; partial.checks = checks; partial.findings = findings; savePartial(partial);

  const m360 = await mobileFlow(browser, { width: 360, height: 740, tag: "360", scrolledShot: true });
  partial.mobile360 = m360; partial.checks = checks; partial.findings = findings; savePartial(partial);

  const m812 = await mobileFlow(browser, { width: 375, height: 812, tag: "812", guard: true });
  partial.mobile812 = m812; partial.checks = checks; partial.findings = findings; savePartial(partial);

  const bp = await boundaryChecks(browser);
  partial.boundaries = bp; partial.checks = checks; savePartial(partial);

  const d = await desktop(browser);
  partial.desktop = d; partial.checks = checks; partial.findings = findings; savePartial(partial);

  await browser.close();

  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass).length;
  const summary = {
    generatedAt: new Date().toISOString(),
    branch: "feat/collapsible-editor-toolbar",
    round: 3,
    harness: "layout-test.mjs (reconstruction, faithful cascade layering, current source synced)",
    viewports: [
      { name: "mobile-667", width: 375, height: 667 },
      { name: "mobile-android-360", width: 360, height: 740 },
      { name: "mobile-tall-812", width: 375, height: 812 },
      { name: "boundary", widths: [767, 767.5, 768] },
      { name: "desktop", width: 1280, height: 800 },
    ],
    checks, findings,
    totals: { passed, failed, total: checks.length },
    bands: {
      "375x667": { capExpected: 0.42 * 667 - 80, region: m667.expanded.region.height, bandRest: m667.bandRest, tapBand: m667.tapBand },
      "360x740": { capExpected: 0.42 * 740 - 80, region: m360.expanded.region.height, bandRest: m360.bandRest, tapBand: m360.tapBand },
      "375x812": { capExpected: 0.42 * 812 - 80, region: m812.expanded.region.height, bandRest: m812.bandRest, tapBand: m812.tapBand },
    },
    metrics: { mobile667: m667, mobile360: m360, mobile812: m812, boundaries: bp, desktop: d },
  };
  fs.writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify(summary, null, 2));
  console.log(`\n=== ROUND 3: ${passed}/${checks.length} checks passed, ${failed} failed ===`);
  if (failed > 0) {
    console.log("\nFAILED CHECKS:");
    checks.filter((c) => !c.pass).forEach((c) => console.log(` - ${c.name} [${c.detail}]`));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
