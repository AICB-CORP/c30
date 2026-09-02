import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const screenshotDir = path.resolve("task-memory/screenshot/fix-editor-scrollable");

function svg(c, w = 280, h = 200, t = "img") {
  const s = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><rect width='100%' height='100%' fill='${c}'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='white'>${t}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
}
const colors = ["#ff69b4", "#8b00ff", "#00bfff", "#ffd700", "#00ff88", "#ff1493"];

function editorHtmlInner({ many, carousel, count = 10 }) {
  let inner = `<p>Raconte ta meilleure histoire… (2004 vibes) placeholder</p>`;
  if (many) {
    if (carousel) {
      const imgs = Array.from(
        { length: count },
        (_, i) =>
          `<img src="${svg(colors[i % colors.length], 280, 200, `photo ${i + 1}`)}" alt="">`,
      ).join("");
      const car = `<div class="retro-carousel" data-carousel="true">${imgs}</div>`;
      inner =
        `<p>Voici mes photos pref ★ (carrousel ${count} images) — le texte doit scroller mais le bouton Publier reste visible !</p>${car}<p>C'était une super soirée, on a dansé jusqu'à 4h. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>` +
        Array.from(
          { length: 6 },
          (_, i) =>
            `<img src="${svg(colors[(i + 3) % colors.length], 400, 250, `extra ${i + 1}`)}" alt="">`,
        ).join("") +
        `<p>Encore du texte pour pousser la hauteur au delà de 45vh. Ligne 1<br/>Ligne 2<br/>Ligne 3</p>`;
    } else {
      inner =
        `<p>10 photos en vrac (sans carrousel) — le conteneur doit scroller, pas la page.</p>` +
        Array.from(
          { length: count },
          (_, i) =>
            `<img src="${svg(colors[i % colors.length], 400, 220, `img ${i + 1}`)}" alt="">`,
        ).join("") +
        `<p>Fin du post</p>`;
    }
  }
  // Return only the modal inner (we will inject into body); use class names as in RetroEditor
  return `
  <div class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/80 p-2" data-testid="modal-outer">
    <div class="retro-box flex w-[95vw] max-w-3xl max-h-[90vh] flex-col overflow-hidden" data-testid="retro-box">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2" data-testid="header">
        <h3 class="neon-pink retro-title text-2xl">✏️ Nouveau post</h3>
        <button type="button" class="text-sm opacity-70 hover:opacity-100" style="background:none;border:none;color:white">✖ Fermer</button>
      </div>
      <input type="text" placeholder="Titre de ton post…" class="mb-3 w-full rounded-lg border-2 border-[#ff69b4] bg-black/60 px-3 py-2 text-white outline-none placeholder:text-white/40" data-testid="title" />
      <div class="mb-3 flex gap-2" data-testid="privacy">
        <button type="button" class="retro-btn tool-btn">🌍 Public</button>
        <button type="button" class="retro-btn tool-btn">🔒 Privé</button>
        <span class="ml-auto self-center text-xs opacity-70">Privé = visible seulement par la destinataire</span>
      </div>
      <div class="mb-2 rounded-lg border-2 border-[#ff69b4]/60 bg-black/40 p-2" data-testid="toolbar">
        <div class="flex flex-wrap items-center gap-1.5">
          <button type="button" class="retro-btn tool-btn font-bold">B</button>
          <button type="button" class="retro-btn tool-btn italic">I</button>
          <button type="button" class="retro-btn tool-btn underline">U</button>
          <button type="button" class="retro-btn tool-btn line-through">S</button>
          <button type="button" class="retro-btn tool-btn">H1</button>
          <button type="button" class="retro-btn tool-btn">H2</button>
          <button type="button" class="retro-btn tool-btn">• Liste</button>
          <button type="button" class="retro-btn tool-btn">1. Liste</button>
          <span class="mx-1 h-6 w-px bg-[#ff69b4]/50" style="display:inline-block;width:1px;height:24px;background:rgba(255,105,180,0.5)"></span>
          <input type="color" value="#FF69B4" class="h-7 w-9 cursor-pointer border-2 border-[#ffb6d9] bg-transparent p-0" style="height:28px;width:36px" />
          <button type="button" class="h-5 w-5 rounded-full border border-white/50" style="height:20px;width:20px;border-radius:999px;background:#FF69B4"></button>
          <button type="button" class="h-5 w-5 rounded-full border border-white/50" style="height:20px;width:20px;border-radius:999px;background:#8B00FF"></button>
          <button type="button" class="h-5 w-5 rounded-full border border-white/50" style="height:20px;width:20px;border-radius:999px;background:#00BFFF"></button>
          <select class="retro-btn tool-btn"><option>Police</option><option>Comic Sans MS</option></select>
          <select class="retro-btn tool-btn"><option>Taille</option><option>16px</option></select>
          <span class="mx-1 h-6 w-px bg-[#ff69b4]/50" style="display:inline-block;width:1px;height:24px;background:rgba(255,105,180,0.5)"></span>
          <button type="button" class="retro-btn tool-btn">⬅</button><button type="button" class="retro-btn tool-btn">⬌</button><button type="button" class="retro-btn tool-btn">➡</button>
          <span class="mx-1 h-6 w-px bg-[#ff69b4]/50" style="display:inline-block;width:1px;height:24px;background:rgba(255,105,180,0.5)"></span>
          <button type="button" class="retro-btn tool-btn">🔗</button><button type="button" class="retro-btn tool-btn">🎵</button><button type="button" class="retro-btn tool-btn">▶️</button>
          <span class="mx-1 h-6 w-px bg-[#ff69b4]/50" style="display:inline-block;width:1px;height:24px;background:rgba(255,105,180,0.5)"></span>
          <div class="flex flex-wrap items-center gap-1">
            <button type="button" class="retro-btn tool-btn">⚡ Néon</button><button type="button" class="retro-btn tool-btn">✨ Arc-en-ciel</button><button type="button" class="retro-btn tool-btn">📜 Défilant</button><button type="button" class="retro-btn tool-btn">💫 Clignotant</button><button type="button" class="retro-btn tool-btn">🔍 Flou</button>
          </div>
          <button type="button" class="retro-btn tool-btn">⚙️ HTML</button>
        </div>
      </div>
      <div class="mb-2 flex flex-wrap gap-1.5" data-testid="media-row">
        <div class="flex items-center gap-1.5"><button type="button" class="retro-btn tool-btn">🖼️ Photos</button><label class="flex items-center gap-1 text-xs opacity-80"><input type="checkbox" checked class="h-3 w-3 accent-[#ff69b4]"> Carrousel</label></div>
        <button type="button" class="retro-btn tool-btn">🎬 Vidéo</button><button type="button" class="retro-btn tool-btn">🎵 Son</button><button type="button" class="retro-btn tool-btn">💬 GIF</button><button type="button" class="retro-btn tool-btn">🎙 Voix</button>
      </div>
      <div class="editor-area mb-2 flex min-h-[180px] flex-1 flex-col overflow-hidden rounded-lg border-2 border-[#ff69b4]/30 bg-black/20" data-testid="editor-area">
        <div class="max-h-[45vh] min-h-[180px] flex-1 overflow-y-auto overflow-x-hidden p-1 md:max-h-[50vh]" data-testid="editor-scroll">
          <div class="tiptap prose-retro" data-testid="tiptap">${inner}</div>
        </div>
      </div>
      <div class="flex gap-2" data-testid="publish-row"><button type="button" class="retro-btn" data-testid="publish-btn">💾 Publier</button><button type="button" class="retro-btn">Annuler</button></div>
    </div>
  </div>
  `;
}

async function testViewport(viewport, name, many, carousel) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  // goto login to get real compiled css
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500); // let css load
  const html = editorHtmlInner({ many, carousel, count: 10 });
  await page.evaluate((h) => {
    document.body.innerHTML = h;
    document.body.className = "min-h-full sparkle-cursor";
  }, html);
  await page.waitForTimeout(500);
  // evaluate metrics
  const metrics = await page.evaluate(() => {
    const ids = [
      "header",
      "title",
      "privacy",
      "toolbar",
      "media-row",
      "editor-area",
      "editor-scroll",
      "publish-row",
    ];
    const rects = {};
    for (const id of ids) {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        rects[id] = {
          h: r.height,
          y: r.y,
          bottom: r.bottom,
          w: r.width,
          display: cs.display,
          flex: cs.flex,
        };
      }
    }
    const box = document.querySelector('[data-testid="retro-box"]');
    const br = box.getBoundingClientRect();
    const bcs = getComputedStyle(box);
    const scroll = document.querySelector('[data-testid="editor-scroll"]');
    const sr = scroll.getBoundingClientRect();
    const scs = getComputedStyle(scroll);
    const publish = document.querySelector('[data-testid="publish-btn"]');
    const pr = publish.getBoundingClientRect();
    const outer = document.querySelector('[data-testid="modal-outer"]');
    const ocs = getComputedStyle(outer);
    const docScrollWidth = document.documentElement.scrollWidth;
    const vh = window.innerHeight,
      vw = window.innerWidth;
    const hasScroll = scroll.scrollHeight > scroll.clientHeight + 1;
    const publishInViewport = pr.top >= 0 && pr.bottom <= vh && pr.left >= 0 && pr.right <= vw;
    const publishOverlapBox = pr.bottom <= br.bottom && pr.top >= br.top;
    // carousel
    const carousel = document.querySelector(".retro-carousel");
    const carouselRect = carousel ? carousel.getBoundingClientRect() : null;
    const carouselImgs = carousel
      ? Array.from(carousel.querySelectorAll("img")).map((i) => {
          const r = i.getBoundingClientRect();
          const cs = getComputedStyle(i);
          return { w: r.width, h: r.height, cw: cs.width, snap: cs.scrollSnapAlign };
        })
      : [];
    // tool btn sizes
    const toolBtns = Array.from(document.querySelectorAll(".retro-btn.tool-btn")).map((b) => {
      const r = b.getBoundingClientRect();
      return { w: r.width, h: r.height, text: (b.textContent || "").trim().slice(0, 12) };
    });
    const pageScrollY = window.scrollY;
    return {
      rects,
      box: {
        h: br.height,
        y: br.y,
        bottom: br.bottom,
        w: br.width,
        flexDirection: bcs.flexDirection,
        overflow: bcs.overflow,
        maxHeight: bcs.maxHeight,
        display: bcs.display,
      },
      scroll: {
        h: sr.height,
        y: sr.y,
        bottom: sr.bottom,
        w: sr.width,
        maxHeight: scs.maxHeight,
        overflowY: scs.overflowY,
        scrollHeight: scroll.scrollHeight,
        clientHeight: scroll.clientHeight,
        hasScroll,
      },
      publish: {
        h: pr.height,
        y: pr.y,
        bottom: pr.bottom,
        w: pr.width,
        inViewport: publishInViewport,
        insideBox: publishOverlapBox,
      },
      outer: { overflow: ocs.overflow, display: ocs.display },
      docScrollWidth,
      vh,
      vw,
      carouselRect,
      carouselImgs,
      toolBtns,
      pageScrollY,
    };
  });
  console.log(
    `\n=== ${name} ${viewport.width}x${viewport.height} many=${many} carousel=${carousel} ===`,
  );
  console.log(JSON.stringify(metrics, null, 2));
  // screenshot
  const outPath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`Screenshot ${outPath}`);
  // also try scrolling inner
  if (many) {
    await page.evaluate(() => {
      const s = document.querySelector('[data-testid="editor-scroll"]');
      if (s) s.scrollTop = s.scrollHeight;
    });
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => {
      const p = document.querySelector('[data-testid="publish-btn"]');
      const pr = p.getBoundingClientRect();
      const s = document.querySelector('[data-testid="editor-scroll"]');
      return {
        publish: {
          y: pr.y,
          bottom: pr.bottom,
          h: pr.height,
          inViewport: pr.top >= 0 && pr.bottom <= window.innerHeight,
        },
        scrollTop: s.scrollTop,
        scrollHeight: s.scrollHeight,
        clientHeight: s.clientHeight,
      };
    });
    console.log("After scroll inner to bottom:", after);
    const scrolledPath = path.join(screenshotDir, `${name}-scrolled.png`);
    await page.screenshot({ path: scrolledPath, fullPage: false });
    console.log(`Scrolled screenshot ${scrolledPath}`);
  }
  await browser.close();
  return metrics;
}

await testViewport({ width: 1280, height: 800 }, "real-empty-desktop", false, false);
await testViewport({ width: 375, height: 812 }, "real-empty-mobile", false, false);
await testViewport({ width: 1280, height: 800 }, "real-many-carousel-desktop", true, true);
await testViewport({ width: 375, height: 812 }, "real-many-carousel-mobile", true, true);
await testViewport({ width: 360, height: 800 }, "real-empty-360", false, false);
