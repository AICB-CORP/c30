import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const screenshotDir = path.resolve("task-memory/screenshot/fix-editor-scrollable");
fs.mkdirSync(screenshotDir, { recursive: true });

function svg(c, w = 280, h = 200, t = "img") {
  const s = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><rect width='100%' height='100%' fill='${c}'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='white'>${t}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
}
const colors = ["#ff69b4", "#8b00ff", "#00bfff", "#ffd700", "#00ff88", "#ff1493"];

function editorHtmlInnerNew({ many, carousel, count = 10 }) {
  let inner = `<p>Raconte ta meilleure histoire avec elle… (2004 vibes) placeholder</p>`;
  if (many) {
    if (carousel) {
      const imgs = Array.from(
        { length: count },
        (_, i) =>
          `<img src="${svg(colors[i % colors.length], 280, 200, `photo ${i + 1}`)}" alt="">`,
      ).join("");
      const car = `<div class="retro-carousel" data-carousel="true">${imgs}</div>`;
      inner =
        `<p>Voici mes photos pref ★ (carrousel ${count} images) — le texte doit scroller mais le bouton Publier reste visible !</p>${car}<p>C'était une super soirée, on a dansé jusqu'à 4h. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt.</p>` +
        Array.from(
          { length: 6 },
          (_, i) =>
            `<img src="${svg(colors[(i + 3) % colors.length], 400, 250, `extra ${i + 1}`)}" alt="">`,
        ).join("") +
        `<p>Encore du texte pour pousser la hauteur au delà de 45vh. Ligne 1<br/>Ligne 2<br/>Ligne 3<br/>Ligne 4<br/>Ligne 5</p>`;
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
  // Mirrors current RetroEditor.tsx (fix/editor-scrollable)
  // outer overflow-hidden, retro-box flex max-h-[90vh] flex-col overflow-hidden
  // header flex-shrink-0, middle flex-1 overflow-y-auto, toolbar flex-nowrap overflow-x-auto, editor-area min-h-[180px] flex-col, footer flex-shrink-0
  return `
  <div class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/80 p-2" data-testid="modal-outer">
    <div class="retro-box flex w-[95vw] max-w-3xl max-h-[90vh] flex-col overflow-hidden" data-testid="retro-box">
      <!-- Header — always visible -->
      <div class="flex-shrink-0" data-testid="header-wrapper">
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
      </div>
      <!-- Scrollable middle — toolbar + media + editor -->
      <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1" data-testid="middle">
        <div class="rounded-lg border-2 border-[#ff69b4]/60 bg-black/40 p-2" data-testid="toolbar-outer">
          <div class="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-1" data-testid="toolbar">
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
            <div class="flex flex-nowrap items-center gap-1">
              <button type="button" class="retro-btn tool-btn">⚡ Néon</button><button type="button" class="retro-btn tool-btn">✨ Arc-en-ciel</button><button type="button" class="retro-btn tool-btn">📜 Défilant</button><button type="button" class="retro-btn tool-btn">💫 Clignotant</button><button type="button" class="retro-btn tool-btn">🔍 Flou</button>
            </div>
            <button type="button" class="retro-btn tool-btn">⚙️ HTML</button>
          </div>
        </div>
        <div class="mb-2 flex flex-wrap gap-1.5" data-testid="media-row">
          <div class="flex items-center gap-1.5"><button type="button" class="retro-btn tool-btn">🖼️ Photos</button><label class="flex items-center gap-1 text-xs opacity-80"><input type="checkbox" checked class="h-3 w-3 accent-[#ff69b4]"> Carrousel</label></div>
          <button type="button" class="retro-btn tool-btn">🎬 Vidéo</button><button type="button" class="retro-btn tool-btn">🎵 Son</button><button type="button" class="retro-btn tool-btn">💬 GIF</button><button type="button" class="retro-btn tool-btn">🎙 Voix</button>
        </div>
        <div class="editor-area mb-2 flex min-h-[180px] flex-col overflow-hidden rounded-lg border-2 border-[#ff69b4]/30 bg-black/20" data-testid="editor-area">
          <div class="min-h-[180px] flex-1 overflow-y-auto overflow-x-hidden p-2" data-testid="editor-scroll">
            <div class="tiptap prose-retro" data-testid="tiptap">${inner}</div>
          </div>
        </div>
        <div data-testid="busy-banner" style="display:none"></div>
      </div>
      <!-- Footer — always visible -->
      <div class="flex flex-shrink-0 gap-2 border-t border-[#ff69b4]/20 pt-3" data-testid="publish-row"><button type="button" class="retro-btn" data-testid="publish-btn">💾 Publier</button><button type="button" class="retro-btn">Annuler</button></div>
    </div>
  </div>
  `;
}

async function testViewport(viewport, name, many, carousel) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const html = editorHtmlInnerNew({ many, carousel, count: 10 });
  await page.evaluate((h) => {
    document.body.innerHTML = h;
    document.body.className = "min-h-full sparkle-cursor";
  }, html);
  await page.waitForTimeout(600);
  const metrics = await page.evaluate(() => {
    const ids = [
      "header",
      "title",
      "privacy",
      "toolbar-outer",
      "toolbar",
      "media-row",
      "editor-area",
      "editor-scroll",
      "middle",
      "header-wrapper",
      "publish-row",
    ];
    const rects = {};
    for (const id of ids) {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        rects[id] = {
          h: Math.round(r.height * 10) / 10,
          y: Math.round(r.top * 10) / 10,
          bottom: Math.round(r.bottom * 10) / 10,
          w: Math.round(r.width * 10) / 10,
          display: cs.display,
          flexDirection: cs.flexDirection,
          flex: cs.flex,
          overflow: cs.overflow,
          overflowX: cs.overflowX,
          overflowY: cs.overflowY,
          flexWrap: cs.flexWrap,
        };
      }
    }
    const box = document.querySelector('[data-testid="retro-box"]');
    const br = box.getBoundingClientRect();
    const bcs = getComputedStyle(box);
    const middle = document.querySelector('[data-testid="middle"]');
    const mr = middle.getBoundingClientRect();
    const mcs = getComputedStyle(middle);
    const scroll = document.querySelector('[data-testid="editor-scroll"]');
    const sr = scroll.getBoundingClientRect();
    const scs = getComputedStyle(scroll);
    const publish = document.querySelector('[data-testid="publish-btn"]');
    const pr = publish.getBoundingClientRect();
    const pcs = getComputedStyle(publish);
    const publishRow = document.querySelector('[data-testid="publish-row"]');
    const prr = publishRow.getBoundingClientRect();
    const prcs = getComputedStyle(publishRow);
    const outer = document.querySelector('[data-testid="modal-outer"]');
    const ocs = getComputedStyle(outer);
    const toolbar = document.querySelector('[data-testid="toolbar"]');
    const tcs = getComputedStyle(toolbar);
    const tr = toolbar.getBoundingClientRect();
    const docScrollWidth = document.documentElement.scrollWidth;
    const vh = window.innerHeight,
      vw = window.innerWidth;
    const hasMiddleScroll = middle.scrollHeight > middle.clientHeight + 1;
    const hasEditorScroll = scroll.scrollHeight > scroll.clientHeight + 1;
    const publishInViewport =
      pr.top >= -1 && pr.bottom <= vh + 1 && pr.left >= -1 && pr.right <= vw + 1;
    const publishInsideBox = pr.bottom <= br.bottom + 1 && pr.top >= br.top - 1;
    const publishRowInsideBox = prr.bottom <= br.bottom + 1 && prr.top >= br.top - 1;
    const carousel = document.querySelector(".retro-carousel");
    const carouselRect = carousel ? carousel.getBoundingClientRect() : null;
    const carouselImgs = carousel
      ? Array.from(carousel.querySelectorAll("img")).map((i) => {
          const r = i.getBoundingClientRect();
          const cs = getComputedStyle(i);
          return {
            w: Math.round(r.width * 10) / 10,
            h: Math.round(r.height * 10) / 10,
            cw: cs.width,
            snap: cs.scrollSnapAlign,
          };
        })
      : [];
    const toolBtns = Array.from(document.querySelectorAll(".retro-btn.tool-btn")).map((b) => {
      const r = b.getBoundingClientRect();
      return {
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
        text: (b.textContent || "").trim().slice(0, 14),
      };
    });
    const pageScrollY = window.scrollY;
    const toolbarScrollable = toolbar.scrollWidth > toolbar.clientWidth + 1;
    return {
      viewport: { w: vw, h: vh },
      docScrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      outer: {
        overflow: ocs.overflow,
        overflowY: ocs.overflowY,
        overflowX: ocs.overflowX,
        display: ocs.display,
        alignItems: ocs.alignItems,
        justifyContent: ocs.justifyContent,
      },
      box: {
        h: Math.round(br.height * 10) / 10,
        y: Math.round(br.top * 10) / 10,
        bottom: Math.round(br.bottom * 10) / 10,
        w: Math.round(br.width * 10) / 10,
        flexDirection: bcs.flexDirection,
        overflow: bcs.overflow,
        overflowY: bcs.overflowY,
        overflowX: bcs.overflowX,
        maxHeight: bcs.maxHeight,
        display: bcs.display,
        flex: bcs.flex,
      },
      middle: {
        h: Math.round(mr.height * 10) / 10,
        y: Math.round(mr.top * 10) / 10,
        bottom: Math.round(mr.bottom * 10) / 10,
        w: Math.round(mr.width * 10) / 10,
        overflowY: mcs.overflowY,
        overflowX: mcs.overflowX,
        flex: mcs.flex,
        scrollHeight: middle.scrollHeight,
        clientHeight: middle.clientHeight,
        hasScroll: hasMiddleScroll,
        display: mcs.display,
        flexDirection: mcs.flexDirection,
        minHeight: mcs.minHeight,
      },
      toolbar: {
        h: Math.round(tr.height * 10) / 10,
        y: Math.round(tr.top * 10) / 10,
        bottom: Math.round(tr.bottom * 10) / 10,
        w: Math.round(tr.width * 10) / 10,
        display: tcs.display,
        flexWrap: tcs.flexWrap,
        overflowX: tcs.overflowX,
        overflowY: tcs.overflowY,
        scrollWidth: toolbar.scrollWidth,
        clientWidth: toolbar.clientWidth,
        scrollable: toolbarScrollable,
      },
      toolbarOuter: rects["toolbar-outer"],
      publish: {
        h: Math.round(pr.height * 10) / 10,
        y: Math.round(pr.top * 10) / 10,
        bottom: Math.round(pr.bottom * 10) / 10,
        w: Math.round(pr.width * 10) / 10,
        inViewport: publishInViewport,
        insideBox: publishInsideBox,
        display: pcs.display,
      },
      publishRow: {
        h: Math.round(prr.height * 10) / 10,
        y: Math.round(prr.top * 10) / 10,
        bottom: Math.round(prr.bottom * 10) / 10,
        w: Math.round(prr.width * 10) / 10,
        insideBox: publishRowInsideBox,
        display: prcs.display,
        position: prcs.position,
      },
      scroll: {
        h: Math.round(sr.height * 10) / 10,
        y: Math.round(sr.top * 10) / 10,
        bottom: Math.round(sr.bottom * 10) / 10,
        w: Math.round(sr.width * 10) / 10,
        maxHeight: scs.maxHeight,
        overflowY: scs.overflowY,
        scrollHeight: scroll.scrollHeight,
        clientHeight: scroll.clientHeight,
        hasScroll: hasEditorScroll,
        minHeight: scs.minHeight,
      },
      rects,
      carouselRect: carouselRect
        ? {
            w: Math.round(carouselRect.width * 10) / 10,
            h: Math.round(carouselRect.height * 10) / 10,
            y: Math.round(carouselRect.top * 10) / 10,
          }
        : null,
      carouselImgs,
      toolBtns,
      pageScrollY,
      horizontalOverflow: docScrollWidth > vw + 1,
    };
  });
  console.log(
    `\n=== ${name} ${viewport.width}x${viewport.height} many=${many} carousel=${carousel} ===`,
  );
  console.log(JSON.stringify(metrics, null, 2));
  const outPath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`Screenshot -> ${outPath}`);
  if (many) {
    // scroll middle to bottom, then editor inner
    await page.evaluate(() => {
      const m = document.querySelector('[data-testid="middle"]');
      if (m) m.scrollTop = m.scrollHeight;
    });
    await page.waitForTimeout(300);
    const afterMiddle = await page.evaluate(() => {
      const p = document.querySelector('[data-testid="publish-btn"]');
      const pr = p.getBoundingClientRect();
      const m = document.querySelector('[data-testid="middle"]');
      const s = document.querySelector('[data-testid="editor-scroll"]');
      return {
        publish: {
          y: pr.y,
          bottom: pr.bottom,
          h: pr.height,
          inViewport: pr.top >= 0 && pr.bottom <= window.innerHeight,
          insideBox:
            pr.bottom <=
            document.querySelector('[data-testid="retro-box"]').getBoundingClientRect().bottom,
        },
        middle: {
          scrollTop: m.scrollTop,
          scrollHeight: m.scrollHeight,
          clientHeight: m.clientHeight,
        },
        editor: {
          scrollTop: s.scrollTop,
          scrollHeight: s.scrollHeight,
          clientHeight: s.clientHeight,
        },
      };
    });
    console.log("After middle scroll to bottom:", JSON.stringify(afterMiddle, null, 2));
    await page.evaluate(() => {
      const s = document.querySelector('[data-testid="editor-scroll"]');
      if (s) s.scrollTop = s.scrollHeight;
    });
    await page.waitForTimeout(300);
    const afterInner = await page.evaluate(() => {
      const p = document.querySelector('[data-testid="publish-btn"]');
      const pr = p.getBoundingClientRect();
      const s = document.querySelector('[data-testid="editor-scroll"]');
      return {
        publish: {
          y: pr.y,
          bottom: pr.bottom,
          h: pr.height,
          inViewport: pr.top >= 0 && pr.bottom <= window.innerHeight,
          insideBox:
            pr.bottom <=
            document.querySelector('[data-testid="retro-box"]').getBoundingClientRect().bottom,
        },
        scrollTop: s.scrollTop,
        scrollHeight: s.scrollHeight,
        clientHeight: s.clientHeight,
      };
    });
    console.log("After inner scroll to bottom:", JSON.stringify(afterInner, null, 2));
    const scrolledPath = path.join(screenshotDir, `${name}-scrolled.png`);
    await page.screenshot({ path: scrolledPath, fullPage: false });
    console.log(`Scrolled screenshot -> ${scrolledPath}`);
  } else {
    // also test scrolling middle even when empty (should not scroll)
    const midCheck = await page.evaluate(() => {
      const m = document.querySelector('[data-testid="middle"]');
      return {
        scrollHeight: m.scrollHeight,
        clientHeight: m.clientHeight,
        hasScroll: m.scrollHeight > m.clientHeight + 1,
        overflowY: getComputedStyle(m).overflowY,
      };
    });
    console.log("Middle scroll check empty:", midCheck);
  }
  await browser.close();
  return metrics;
}

const results = {};
results["fixed-empty-desktop"] = await testViewport(
  { width: 1280, height: 800 },
  "editor-fixed-desktop",
  false,
  false,
);
results["fixed-empty-mobile-375"] = await testViewport(
  { width: 375, height: 812 },
  "editor-fixed-mobile-375",
  false,
  false,
);
results["fixed-empty-mobile-360"] = await testViewport(
  { width: 360, height: 800 },
  "editor-fixed-mobile-360",
  false,
  false,
);
results["fixed-many-desktop"] = await testViewport(
  { width: 1280, height: 800 },
  "editor-fixed-many-desktop",
  true,
  true,
);
results["fixed-many-mobile-375"] = await testViewport(
  { width: 375, height: 812 },
  "editor-fixed-many-mobile-375",
  true,
  true,
);
results["fixed-many-mobile-360"] = await testViewport(
  { width: 360, height: 800 },
  "editor-fixed-many-mobile-360",
  true,
  true,
);
results["fixed-many-stacked-desktop"] = await testViewport(
  { width: 1280, height: 800 },
  "editor-fixed-many-stacked-desktop",
  true,
  false,
);
results["fixed-many-stacked-mobile-375"] = await testViewport(
  { width: 375, height: 812 },
  "editor-fixed-many-stacked-mobile-375",
  true,
  false,
);

// write metrics.json
const metricsOut = {
  generatedAt: new Date().toISOString(),
  branch: "fix/editor-scrollable",
  description: "Post-fix retest: toolbar nowrap + flex-col scrollable middle",
  results,
};
fs.writeFileSync(
  path.join(screenshotDir, "metrics-fixed.json"),
  JSON.stringify(metricsOut, null, 2),
);
console.log("\nMetrics written to metrics-fixed.json");
