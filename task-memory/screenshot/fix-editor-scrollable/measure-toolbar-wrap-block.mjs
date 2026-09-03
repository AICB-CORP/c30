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

function editorHtmlWrapBlock({ many, carousel, count = 10 }) {
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
        `<p>Voici mes photos pref ★ (carrousel ${count} images) — le texte doit scroller mais le bouton Publier reste visible ! Toolbar sticky.</p>${car}<p>C'était une super soirée, on a dansé jusqu'à 4h. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.</p>` +
        Array.from(
          { length: 6 },
          (_, i) =>
            `<img src="${svg(colors[(i + 3) % colors.length], 400, 250, `extra ${i + 1}`)}" alt="">`,
        ).join("") +
        `<p>Encore du texte pour pousser la hauteur au delà de 45vh. Ligne 1<br/>Ligne 2<br/>Ligne 3<br/>Ligne 4<br/>Ligne 5<br/>Ligne 6</p>`;
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
  // Mirrors CURRENT RetroEditor.tsx after fix/editor-scrollable latest:
  // outer fixed overflow-hidden, retro-box max-h-[90vh] flex-col overflow-hidden
  // middle flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 with toolbar sticky top-0 z-10
  // toolbar inner flex flex-wrap (was flex-nowrap overflow-x-auto), so block not scrollable
  // editor flex min-h-[280px] flex-col (was min-h 180 flex-1 overflow-y-auto inner), so editor grows and middle handles scroll
  // footer flex-shrink-0
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
      <!-- Middle — toolbar block (not scrollable, sticky) + editor scrollable via middle -->
      <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1" data-testid="middle">
        <div class="sticky top-0 z-10 flex-shrink-0 rounded-lg border-2 border-[#ff69b4]/60 bg-black/40 p-2 backdrop-blur-sm" data-testid="toolbar-outer">
          <div class="flex flex-wrap items-center gap-1.5" data-testid="toolbar">
            <button type="button" class="retro-btn tool-btn font-bold" data-testid="btn-B">B</button>
            <button type="button" class="retro-btn tool-btn italic" data-testid="btn-I">I</button>
            <button type="button" class="retro-btn tool-btn underline" data-testid="btn-U">U</button>
            <button type="button" class="retro-btn tool-btn line-through" data-testid="btn-S">S</button>
            <button type="button" class="retro-btn tool-btn" data-testid="btn-H1">H1</button>
            <button type="button" class="retro-btn tool-btn" data-testid="btn-H2">H2</button>
            <button type="button" class="retro-btn tool-btn" data-testid="btn-ul">• Liste</button>
            <button type="button" class="retro-btn tool-btn" data-testid="btn-ol">1. Liste</button>
            <span class="mx-1 h-6 w-px bg-[#ff69b4]/50" style="display:inline-block;width:1px;height:24px;background:rgba(255,105,180,0.5)"></span>
            <input type="color" value="#FF69B4" class="h-7 w-9 cursor-pointer border-2 border-[#ffb6d9] bg-transparent p-0" style="height:28px;width:36px" data-testid="color-input" />
            <button type="button" class="h-5 w-5 rounded-full border border-white/50" style="height:20px;width:20px;border-radius:999px;background:#FF69B4" data-testid="swatch"></button>
            <button type="button" class="h-5 w-5 rounded-full border border-white/50" style="height:20px;width:20px;border-radius:999px;background:#8B00FF"></button>
            <button type="button" class="h-5 w-5 rounded-full border border-white/50" style="height:20px;width:20px;border-radius:999px;background:#00BFFF"></button>
            <select class="retro-btn tool-btn" data-testid="select-font"><option>Police</option><option>Comic Sans MS</option></select>
            <select class="retro-btn tool-btn" data-testid="select-size"><option>Taille</option><option>16px</option></select>
            <span class="mx-1 h-6 w-px bg-[#ff69b4]/50" style="display:inline-block;width:1px;height:24px;background:rgba(255,105,180,0.5)"></span>
            <button type="button" class="retro-btn tool-btn" data-testid="btn-align-left">⬅</button><button type="button" class="retro-btn tool-btn" data-testid="btn-align-center">⬌</button><button type="button" class="retro-btn tool-btn" data-testid="btn-align-right">➡</button>
            <span class="mx-1 h-6 w-px bg-[#ff69b4]/50" style="display:inline-block;width:1px;height:24px;background:rgba(255,105,180,0.5)"></span>
            <button type="button" class="retro-btn tool-btn" data-testid="btn-link">🔗</button><button type="button" class="retro-btn tool-btn" data-testid="btn-music">🎵</button><button type="button" class="retro-btn tool-btn" data-testid="btn-video">▶️</button>
            <span class="mx-1 h-6 w-px bg-[#ff69b4]/50" style="display:inline-block;width:1px;height:24px;background:rgba(255,105,180,0.5)"></span>
            <div class="flex flex-wrap items-center gap-1" data-testid="neon-group">
              <button type="button" class="retro-btn tool-btn" data-testid="btn-neon">⚡ Néon</button><button type="button" class="retro-btn tool-btn" data-testid="btn-rainbow">✨ Arc-en-ciel</button><button type="button" class="retro-btn tool-btn" data-testid="btn-marquee">📜 Défilant</button><button type="button" class="retro-btn tool-btn" data-testid="btn-blink">💫 Clignotant</button><button type="button" class="retro-btn tool-btn" data-testid="btn-blur">🔍 Flou</button>
            </div>
            <button type="button" class="retro-btn tool-btn" data-testid="btn-html">⚙️ HTML</button>
          </div>
        </div>
        <div class="mb-2 flex flex-wrap gap-1.5" data-testid="media-row">
          <div class="flex items-center gap-1.5"><button type="button" class="retro-btn tool-btn" data-testid="btn-photos">🖼️ Photos</button><label class="flex items-center gap-1 text-xs opacity-80"><input type="checkbox" checked class="h-3 w-3 accent-[#ff69b4]"> Carrousel</label></div>
          <button type="button" class="retro-btn tool-btn" data-testid="btn-video-media">🎬 Vidéo</button><button type="button" class="retro-btn tool-btn" data-testid="btn-audio">🎵 Son</button><button type="button" class="retro-btn tool-btn" data-testid="btn-gif">💬 GIF</button><button type="button" class="retro-btn tool-btn" data-testid="btn-voice">🎙 Voix</button>
        </div>
        <div class="editor-area mb-2 flex min-h-[280px] flex-col rounded-lg border-2 border-[#ff69b4]/30 bg-black/20 p-2" data-testid="editor-area">
          <div class="tiptap prose-retro" data-testid="tiptap">${inner}</div>
        </div>
      </div>
      <!-- Footer — always visible -->
      <div class="flex flex-shrink-0 gap-2 border-t border-[#ff69b4]/20 pt-3" data-testid="publish-row">
        <button type="button" class="retro-btn" data-testid="publish-btn">💾 Publier</button>
        <button type="button" class="retro-btn" data-testid="cancel-btn">Annuler</button>
      </div>
    </div>
  </div>
  `;
}

async function testViewport(viewport, name, many, carousel) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  // Load compiled Tailwind via real app route
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(800);

  const html = editorHtmlWrapBlock({ many, carousel });
  await page.evaluate((h) => {
    document.body.innerHTML = h;
    document.body.style.margin = "0";
    document.documentElement.style.overflow = "hidden";
  }, html);
  await page.waitForTimeout(700);

  // metrics
  const metrics = await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const docScrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const pageScrollY = window.scrollY;

    const outer = document.querySelector('[data-testid="modal-outer"]');
    const box = document.querySelector('[data-testid="retro-box"]');
    const middle = document.querySelector('[data-testid="middle"]');
    const toolbar = document.querySelector('[data-testid="toolbar"]');
    const toolbarOuter = document.querySelector('[data-testid="toolbar-outer"]');
    const publish = document.querySelector('[data-testid="publish-btn"]');
    const publishRow = document.querySelector('[data-testid="publish-row"]');
    const editorArea = document.querySelector('[data-testid="editor-area"]');
    const editorTiptap = document.querySelector('[data-testid="tiptap"]');
    const headerWrapper = document.querySelector('[data-testid="header-wrapper"]');

    const br = box.getBoundingClientRect();
    const mr = middle.getBoundingClientRect();
    const tr = toolbar.getBoundingClientRect();
    const tor = toolbarOuter.getBoundingClientRect();
    const pr = publish.getBoundingClientRect();
    const prr = publishRow.getBoundingClientRect();
    const er = editorArea.getBoundingClientRect();
    const hr = headerWrapper.getBoundingClientRect();

    const ocs = getComputedStyle(outer);
    const bcs = getComputedStyle(box);
    const mcs = getComputedStyle(middle);
    const tcs = getComputedStyle(toolbar);
    const tocs = getComputedStyle(toolbarOuter);
    const pcs = getComputedStyle(publish);
    const prcs = getComputedStyle(publishRow);
    const ecs = getComputedStyle(editorArea);
    const hrcs = getComputedStyle(headerWrapper);

    const hasMiddleScroll = middle.scrollHeight > middle.clientHeight + 1;
    const toolbarScrollable = toolbar.scrollWidth > toolbar.clientWidth + 1;
    const toolbarOverflowsHorizontally =
      toolbar.scrollWidth > toolbar.clientWidth + 1 && tcs.overflowX !== "visible";
    // rows via unique top positions
    const children = Array.from(toolbar.children);
    const tops = [
      ...new Set(children.map((el) => Math.round(el.getBoundingClientRect().top))),
    ].sort((a, b) => a - b);
    const rows = tops.length;

    const publishInViewport = pr.top >= 0 && pr.bottom <= window.innerHeight + 1;
    const publishInsideBox = pr.bottom <= br.bottom + 1 && pr.top >= br.top - 1;
    const publishRowInsideBox = prr.bottom <= br.bottom + 1;

    // touch targets
    const btns = Array.from(
      document.querySelectorAll(
        '.retro-btn, [data-testid="publish-btn"], [data-testid="cancel-btn"]',
      ),
    );
    const toolBtns = btns.map((b) => {
      const r = b.getBoundingClientRect();
      return {
        text: (b.textContent || "").trim().slice(0, 20),
        w: Math.round(r.width),
        h: Math.round(r.height),
        ok: r.width >= 44 && r.height >= 44,
      };
    });
    const badTargets = toolBtns.filter((b) => !b.ok && !b.text.includes("Photos") && b.text !== "");

    // horizontal overflow check
    const horizontalOverflow = docScrollWidth > vw + 1;

    // sticky check: get toolbarOuter position relative to middle
    const toolbarSticky =
      tocs.position === "sticky" ||
      tcs.position === "sticky" ||
      toolbarOuter.classList.contains("sticky");

    const rects = {
      header: {
        h: Math.round(hr.height * 10) / 10,
        y: Math.round(hr.top * 10) / 10,
        bottom: Math.round(hr.bottom * 10) / 10,
        display: hrcs.display,
        position: hrcs.position,
      },
      toolbarOuter: {
        h: Math.round(tor.height * 10) / 10,
        y: Math.round(tor.top * 10) / 10,
        bottom: Math.round(tor.bottom * 10) / 10,
        position: tocs.position,
        top: tocs.top,
        display: tocs.display,
        flexShrink: tocs.flexShrink,
      },
      toolbar: {
        h: Math.round(tr.height * 10) / 10,
        y: Math.round(tr.top * 10) / 10,
        bottom: Math.round(tr.bottom * 10) / 10,
        display: tcs.display,
        flexWrap: tcs.flexWrap,
        overflowX: tcs.overflowX,
        overflow: tcs.overflow,
        scrollWidth: toolbar.scrollWidth,
        clientWidth: toolbar.clientWidth,
        rows,
      },
      editorArea: {
        h: Math.round(er.height * 10) / 10,
        y: Math.round(er.top * 10) / 10,
        bottom: Math.round(er.bottom * 10) / 10,
        minHeight: ecs.minHeight,
        display: ecs.display,
        flexDirection: ecs.flexDirection,
        flex: ecs.flex,
      },
    };

    // carousel if exists
    const carouselEl = document.querySelector(".retro-carousel");
    let carouselRect = null;
    let carouselImgs = [];
    if (carouselEl) {
      const cr = carouselEl.getBoundingClientRect();
      const ccs = getComputedStyle(carouselEl);
      carouselRect = {
        w: Math.round(cr.width),
        h: Math.round(cr.height),
        overflowX: ccs.overflowX,
        gap: ccs.gap,
      };
      carouselImgs = Array.from(carouselEl.querySelectorAll("img")).map((img) => {
        const ir = img.getBoundingClientRect();
        return { w: Math.round(ir.width), h: Math.round(ir.height) };
      });
    }

    return {
      viewport: { w: vw, h: vh },
      docScrollWidth,
      bodyScrollWidth,
      pageScrollY,
      horizontalOverflow,
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
      },
      middle: {
        h: Math.round(mr.height * 10) / 10,
        y: Math.round(mr.top * 10) / 10,
        bottom: Math.round(mr.bottom * 10) / 10,
        w: Math.round(mr.width * 10) / 10,
        overflow: mcs.overflow,
        overflowY: mcs.overflowY,
        overflowX: mcs.overflowX,
        flex: mcs.flex,
        flexShrink: mcs.flexShrink,
        minHeight: mcs.minHeight,
        scrollHeight: middle.scrollHeight,
        clientHeight: middle.clientHeight,
        hasScroll: hasMiddleScroll,
        display: mcs.display,
        flexDirection: mcs.flexDirection,
        scrollTop: middle.scrollTop,
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
        overflow: tcs.overflow,
        scrollWidth: toolbar.scrollWidth,
        clientWidth: toolbar.clientWidth,
        scrollable: toolbarScrollable,
        overflowsHorizontally: toolbarOverflowsHorizontally,
        rows,
        isBlockNotScrollable: tcs.flexWrap === "wrap" && !toolbarScrollable,
        position: tcs.position,
      },
      toolbarOuter: {
        h: Math.round(tor.height * 10) / 10,
        y: Math.round(tor.top * 10) / 10,
        bottom: Math.round(tor.bottom * 10) / 10,
        w: Math.round(tor.width * 10) / 10,
        display: tocs.display,
        flexShrink: tocs.flexShrink,
        overflow: tocs.overflow,
        overflowY: tocs.overflowY,
        overflowX: tocs.overflowX,
        position: tocs.position,
        top: tocs.top,
        zIndex: tocs.zIndex,
      },
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
        flexShrink: prcs.flexShrink,
      },
      editorArea: {
        h: Math.round(er.height * 10) / 10,
        y: Math.round(er.top * 10) / 10,
        bottom: Math.round(er.bottom * 10) / 10,
        w: Math.round(er.width * 10) / 10,
        minHeight: ecs.minHeight,
        display: ecs.display,
        flexDirection: ecs.flexDirection,
        flex: ecs.flex,
        overflow: ecs.overflow,
        overflowY: ecs.overflowY,
      },
      editorTiptap: {
        scrollHeight: editorTiptap ? editorTiptap.scrollHeight : 0,
        clientHeight: editorTiptap ? editorTiptap.clientHeight : 0,
      },
      rects,
      carouselRect,
      carouselImgs,
      toolBtns,
      badTargets,
      pageScrollY,
      horizontalOverflow,
      toolbarStickyClass: toolbarSticky,
    };
  });

  console.log(
    `\n=== ${name} ${viewport.width}x${viewport.height} many=${many} carousel=${carousel} ===`,
  );
  console.log(JSON.stringify(metrics, null, 2));
  const outPath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`Screenshot -> ${outPath}`);

  // Test sticky: scroll middle to bottom, toolbar y unchanged, publish still insideBox
  if (many) {
    const before = metrics;
    await page.evaluate(() => {
      const m = document.querySelector('[data-testid="middle"]');
      if (m) m.scrollTop = m.scrollHeight;
    });
    await page.waitForTimeout(500);
    const afterMiddleScroll = await page.evaluate(() => {
      const middle = document.querySelector('[data-testid="middle"]');
      const toolbarOuter = document.querySelector('[data-testid="toolbar-outer"]');
      const toolbar = document.querySelector('[data-testid="toolbar"]');
      const publish = document.querySelector('[data-testid="publish-btn"]');
      const box = document.querySelector('[data-testid="retro-box"]');
      const editorArea = document.querySelector('[data-testid="editor-area"]');
      return {
        middle: {
          scrollTop: middle.scrollTop,
          scrollHeight: middle.scrollHeight,
          clientHeight: middle.clientHeight,
        },
        toolbarOuter: {
          y: toolbarOuter.getBoundingClientRect().top,
          bottom: toolbarOuter.getBoundingClientRect().bottom,
          h: toolbarOuter.getBoundingClientRect().height,
        },
        toolbar: {
          y: toolbar.getBoundingClientRect().top,
          bottom: toolbar.getBoundingClientRect().bottom,
        },
        editorArea: {
          y: editorArea.getBoundingClientRect().top,
          bottom: editorArea.getBoundingClientRect().bottom,
        },
        publish: {
          y: publish.getBoundingClientRect().top,
          bottom: publish.getBoundingClientRect().bottom,
          inViewport:
            publish.getBoundingClientRect().top >= 0 &&
            publish.getBoundingClientRect().bottom <= window.innerHeight,
          insideBox:
            publish.getBoundingClientRect().bottom <= box.getBoundingClientRect().bottom + 1,
        },
      };
    });
    console.log("After middle scroll to bottom:", JSON.stringify(afterMiddleScroll, null, 2));
    const toolbarFixed =
      Math.abs(afterMiddleScroll.toolbar.y - before.toolbarOuter.y) < 5 ||
      Math.abs(afterMiddleScroll.toolbarOuter.y - before.toolbarOuter.y) < 5;
    console.log(
      `Toolbar sticky after middle scroll? ${toolbarFixed} (beforeOuter y ${before.toolbarOuter.y} -> afterOuter ${afterMiddleScroll.toolbarOuter.y}, before toolbar y ${before.toolbar.y} -> after ${afterMiddleScroll.toolbar.y})`,
    );
    const scrolledPath = path.join(screenshotDir, `${name}-scrolled.png`);
    await page.screenshot({ path: scrolledPath, fullPage: false });
    console.log(`Scrolled screenshot -> ${scrolledPath}`);
    await page.evaluate(() => {
      const m = document.querySelector('[data-testid="middle"]');
      if (m) m.scrollTop = 0;
    });
    await page.waitForTimeout(300);
  } else {
    // also test middle overflow for empty
    const midCheck = await page.evaluate(() => {
      const m = document.querySelector('[data-testid="middle"]');
      return {
        middle: {
          scrollHeight: m.scrollHeight,
          clientHeight: m.clientHeight,
          hasScroll: m.scrollHeight > m.clientHeight + 1,
          overflowY: getComputedStyle(m).overflowY,
        },
        editorArea: {
          minHeight: getComputedStyle(document.querySelector('[data-testid="editor-area"]'))
            .minHeight,
          h: document.querySelector('[data-testid="editor-area"]').getBoundingClientRect().height,
        },
      };
    });
    console.log("Empty check middle/editor:", midCheck);
    // Try scrolling middle a bit even when empty — should not change toolbar if sticky works
    await page.evaluate(() => {
      const m = document.querySelector('[data-testid="middle"]');
      if (m) m.scrollTop = 50;
    });
    await page.waitForTimeout(300);
    const afterScrollEmpty = await page.evaluate(() => {
      const toolbarOuter = document.querySelector('[data-testid="toolbar-outer"]');
      const publish = document.querySelector('[data-testid="publish-btn"]');
      const box = document.querySelector('[data-testid="retro-box"]');
      return {
        toolbarOuter: { y: toolbarOuter.getBoundingClientRect().top },
        publish: {
          insideBox:
            publish.getBoundingClientRect().bottom <= box.getBoundingClientRect().bottom + 1,
        },
      };
    });
    console.log("After empty middle scroll 50px:", afterScrollEmpty);
  }
  await browser.close();
  return metrics;
}

const results = {};
results["toolbar-wrap-block-desktop-empty"] = await testViewport(
  { width: 1280, height: 800 },
  "toolbar-wrap-block-desktop",
  false,
  false,
);
results["toolbar-wrap-block-mobile-375-empty"] = await testViewport(
  { width: 375, height: 812 },
  "toolbar-wrap-block-mobile-375",
  false,
  false,
);
results["toolbar-wrap-block-mobile-360-empty"] = await testViewport(
  { width: 360, height: 800 },
  "toolbar-wrap-block-mobile-360",
  false,
  false,
);

results["editor-wrap-block-desktop-many"] = await testViewport(
  { width: 1280, height: 800 },
  "editor-wrap-block-desktop",
  true,
  true,
);
results["editor-wrap-block-mobile-375-many"] = await testViewport(
  { width: 375, height: 812 },
  "editor-wrap-block-mobile-375",
  true,
  true,
);
results["editor-wrap-block-mobile-360-many"] = await testViewport(
  { width: 360, height: 800 },
  "editor-wrap-block-mobile-360",
  true,
  true,
);

results["editor-wrap-block-stacked-desktop"] = await testViewport(
  { width: 1280, height: 800 },
  "editor-wrap-block-stacked-desktop",
  true,
  false,
);
results["editor-wrap-block-stacked-mobile-375"] = await testViewport(
  { width: 375, height: 812 },
  "editor-wrap-block-stacked-mobile-375",
  true,
  false,
);

// Also produce legacy-named copies required by task spec (toolbar-wrap-block-... already satisfies, but also ensure toolbar-wrap-block-desktop etc for backward compat)
const metricsOut = {
  generatedAt: new Date().toISOString(),
  branch: "fix/editor-scrollable",
  description:
    "Re-test RetroEditor toolbar block flex-wrap + middle overflow-y-auto sticky + editor min-h 280",
  results,
};
fs.writeFileSync(
  path.join(screenshotDir, "metrics-wrap-block.json"),
  JSON.stringify(metricsOut, null, 2),
);
fs.writeFileSync(path.join(screenshotDir, "metrics.json"), JSON.stringify(metricsOut, null, 2));
console.log("\nMetrics written to metrics-wrap-block.json and metrics.json");

// also copy legacy names for task: toolbar-wrap-block-desktop/mobile as required
// already done above, also ensure toolbar-block-desktop.png aliases exist for older REPORT
for (const f of [
  "toolbar-wrap-block-desktop.png",
  "toolbar-wrap-block-mobile-375.png",
  "toolbar-wrap-block-mobile-360.png",
]) {
  const src = path.join(screenshotDir, f);
  const alias = f.replace("toolbar-wrap-block", "toolbar-block");
  const dst = path.join(screenshotDir, alias);
  if (fs.existsSync(src) && !fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
    console.log(`Alias ${alias} -> ${f}`);
  }
}
// editor copies
for (const [srcName, dstName] of [
  ["editor-wrap-block-desktop.png", "editor-scrollable-desktop.png"],
  ["editor-wrap-block-mobile-375.png", "editor-scrollable-mobile-375.png"],
  ["editor-wrap-block-mobile-360.png", "editor-scrollable-mobile-360.png"],
]) {
  const src = path.join(screenshotDir, srcName);
  const dst = path.join(screenshotDir, dstName);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log(`Alias copy ${dstName} from ${srcName}`);
  }
}
console.log("Done measure-toolbar-wrap-block");
