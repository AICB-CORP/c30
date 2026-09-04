import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const screenshotDir = path.resolve("task-memory/screenshot/fix-posts-max-width-872");
fs.mkdirSync(screenshotDir, { recursive: true });

function homeHtml() {
  // Mirrors app/(site)/layout.tsx + app/(site)/page.tsx + PostCard.tsx exactly
  return `
  <div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-3 py-4" data-testid="site-outer">
    <header class="retro-pink-box mb-6 text-center" data-testid="header">
      <h1 class="retro-title">★ Skyblog des 30 ans ★</h1>
      <div class="marquee mt-2 text-sm opacity-90" data-testid="marquee">
        <span>♥ bienvenue sur le blog le plus 2006 du monde ♥ néons ♥ gifs ♥ marquee ♥ messages d'amour ♥ compteur de visites ♥</span>
      </div>
      <nav class="mt-4 flex flex-wrap items-center justify-center gap-2" data-testid="nav">
        <a class="retro-btn">🏠 Accueil</a>
        <a class="retro-btn">💬 Le Blab</a>
        <a class="retro-btn">👤 Mon profil</a>
        <a class="retro-btn">⚙️ Mon compte</a>
      </nav>
      <p class="mt-3 text-xs opacity-90">Connecté : <span class="font-bold">@Bella-91</span><span class="mood-chip"> nostalgique 💜</span></p>
    </header>

    <main class="flex-1" data-testid="main">
      <div class="mx-auto grid w-full max-w-[872px] gap-6 lg:grid-cols-[1fr_300px]" data-testid="posts-grid">
        <div data-testid="posts-col">
          <article class="retro-box mx-auto mb-5 w-full max-w-[872px]" data-testid="postcard-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <a class="font-bold text-[#ff69b4] hover:underline">@Bella-91</a>
              <div class="flex flex-wrap items-center gap-2 text-xs opacity-80">
                <span class="rounded-full border border-[#ff69b4] bg-black/50 px-2 py-0.5 text-[#ffb6d9]">en mode 2006</span>
                <span>il y a 2 jours</span>
              </div>
            </div>
            <h2 class="neon-pink retro-title mt-3 text-2xl" data-testid="post-title">Ma plus belle soirée avec Caro ✨</h2>
            <div class="mt-1 text-xs font-bold"><span class="text-[#00ff88]">🌍 Public</span></div>
            <div class="post-content mt-3" data-testid="post-content-1">
              <p>Caro, tu es la plus belle rencontre de 2008. <span class="neon-pink">Je t'aime fort</span> ♥ On a dansé jusqu'à 4h du mat, et ce <span class="rainbow-text">moment était magique</span> ! <span class="blink">clignote 2006</span></p>
              <div class="marquee mt-2"><span>✨ texte défilant authentique ✨ glitter ✨</span></div>
              <p style="margin-top:8px">Lorem ipsum dolor sit amet, consectetur adipiscing elit. <b>Texte en gras</b> et <i>italique</i> pour tester le rendu. Une longue phrase sans espaces_supercalifragilistique_pour_tester_overflow-wrap_et_word-break_sur_mobile_375px.</p>
              <img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='340'><rect width='100%' height='100%' fill='#ff69b4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='white'>photo 600x340</text></svg>`)}" alt="fake photo" />
            </div>
          </article>

          <article class="retro-box mx-auto mb-5 w-full max-w-[872px]" data-testid="postcard-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <a class="font-bold text-[#ff69b4] hover:underline">@Ludo-92</a>
              <div class="flex flex-wrap items-center gap-2 text-xs opacity-80">
                <span>il y a 5 jours</span>
              </div>
            </div>
            <h2 class="neon-pink retro-title mt-3 text-2xl">Complices depuis 2004 💜</h2>
            <div class="mt-1 text-xs font-bold"><span class="text-[#ffd700]">🔒 Privé</span></div>
            <div class="post-content mt-3" data-testid="post-content-2">
              <p>Deuxième post pour vérifier l'empilement. La largeur ne doit pas exploser, même avec une image large.</p>
              <img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='800' height='400'><rect width='100%' height='100%' fill='#8b00ff'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='white'>image large 800x400</text></svg>`)}" alt="large img" />
              <p>Un autre paragraphe avec <a href="#" class="underline">un lien</a> et encore du texte pour remplir.</p>
              <div class="retro-carousel" data-testid="post-carousel">
                <img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='280' height='200'><rect width='100%' height='100%' fill='#00bfff'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white'>car 1</text></svg>`)}" alt="">
                <img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='280' height='200'><rect width='100%' height='100%' fill='#ff1493'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white'>car 2</text></svg>`)}" alt="">
                <img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='280' height='200'><rect width='100%' height='100%' fill='#ffd700'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white'>car 3</text></svg>`)}" alt="">
              </div>
            </div>
          </article>

          <article class="retro-box mx-auto mb-5 w-full max-w-[872px]" data-testid="postcard-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <a class="font-bold text-[#ff69b4] hover:underline">@Karim-95</a>
              <div class="flex flex-wrap items-center gap-2 text-xs opacity-80">
                <span>il y a 1 semaine</span>
              </div>
            </div>
            <h2 class="neon-pink retro-title mt-3 text-2xl">Tu as changé ma vie ✨</h2>
            <div class="post-content mt-3">Texte court.</div>
          </article>
        </div>

        <aside class="space-y-4 self-start lg:sticky lg:top-4" data-testid="sidebar">
          <div class="retro-box" data-testid="widget-countdown">
            <h3 class="neon-pink font-bold">⏰ J-45 avant les 30 ans</h3>
            <div class="odometer mt-2">045</div>
          </div>
          <div class="retro-box" data-testid="widget-hitcounter">
            <h3 class="font-bold">👁️ Visites</h3>
            <div class="odometer">01234</div>
          </div>
          <div class="retro-box" data-testid="widget-ranking">
            <h3 class="font-bold">🏆 Classement</h3>
            <p class="text-sm">1. Bella-91 — 12 posts</p>
            <p class="text-sm">2. Ludo-92 — 8 posts</p>
          </div>
          <div class="retro-box" data-testid="widget-bestof">
            <h3 class="font-bold">⭐ Best-of</h3>
            <p class="text-sm">Carrousel aléatoire</p>
          </div>
        </aside>
      </div>
    </main>

    <footer class="mt-10 text-center text-sm opacity-70" data-testid="footer">Fait avec ♥, de 2006 à nos jours</footer>
  </div>
  `;
}

async function measure(viewport, name) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();

  // Load compiled CSS via /login (same trick as previous layout testers)
  let cssLoaded = false;
  try {
    await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded", timeout: 8000 });
    await page.waitForTimeout(800);
    cssLoaded = await page.evaluate(() => document.querySelector('link[rel="stylesheet"]') !== null || document.styleSheets.length > 0);
  } catch (e) {
    console.log(`WARN goto /login failed ${viewport.width}x${viewport.height}: ${e.message}`);
  }

  const html = homeHtml();
  await page.evaluate((h) => {
    document.body.innerHTML = h;
    document.body.className = "min-h-full sparkle-cursor";
    document.documentElement.className = "h-full";
  }, html);
  await page.waitForTimeout(700);

  const metrics = await page.evaluate(() => {
    const qs = (s) => document.querySelector(s);
    const qsa = (s) => Array.from(document.querySelectorAll(s));
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x*10)/10, y: Math.round(r.y*10)/10, w: Math.round(r.width*10)/10, h: Math.round(r.height*10)/10, left: Math.round(r.left*10)/10, right: Math.round(r.right*10)/10, top: Math.round(r.top*10)/10, bottom: Math.round(r.bottom*10)/10 };
    };
    const cs = (el) => el ? getComputedStyle(el) : null;
    const vw = window.innerWidth, vh = window.innerHeight;
    const dsw = document.documentElement.scrollWidth, bsw = document.body.scrollWidth;

    const outer = qs('[data-testid="site-outer"]');
    const header = qs('[data-testid="header"]');
    const main = qs('[data-testid="main"]');
    const grid = qs('[data-testid="posts-grid"]');
    const postsCol = qs('[data-testid="posts-col"]');
    const sidebar = qs('[data-testid="sidebar"]');
    const cards = qsa('[data-testid^="postcard-"]');
    const footer = qs('[data-testid="footer"]');

    const outerCS = cs(outer);
    const headerCS = cs(header);
    const gridCS = cs(grid);
    const sidebarCS = sidebar ? cs(sidebar) : null;

    const outerRect = rect(outer);
    const headerRect = rect(header);
    const gridRect = rect(grid);
    const mainRect = rect(main);
    const postsColRect = rect(postsCol);
    const sidebarRect = rect(sidebar);
    const footerRect = rect(footer);

    const cardMetrics = cards.map((c, i) => {
      const r = rect(c);
      const s = cs(c);
      return {
        index: i+1,
        rect: r,
        computed: s ? {
          width: s.width,
          maxWidth: s.maxWidth,
          marginLeft: s.marginLeft,
          marginRight: s.marginRight,
          boxSizing: s.boxSizing,
          display: s.display,
        } : null,
        // centered check: mx-auto => margins auto
        isCentered: s ? (s.marginLeft === "auto" || s.marginLeft.endsWith("px") ) : false,
        wVsMax: s ? { w: r.w, max: s.maxWidth } : null,
      };
    });

    // Grid checks
    let gridChecks = null;
    if (grid && gridCS) {
      gridChecks = {
        display: gridCS.display,
        width: gridCS.width,
        maxWidth: gridCS.maxWidth,
        marginLeft: gridCS.marginLeft,
        marginRight: gridCS.marginRight,
        gap: gridCS.gap,
        gridTemplateColumns: gridCS.gridTemplateColumns,
        boxSizing: gridCS.boxSizing,
        // At 375, gridTemplateColumns should be single col (not the lg two-col)
        // At 1280, should be two cols: 1fr 300px
      };
    }

    // Header vs grid alignment
    const headerGridDelta = headerRect && gridRect ? Math.abs(headerRect.w - gridRect.w) : null;
    // At desktop, outer is capped 896, inner 872, so header and grid both 872 => delta 0
    // At mobile, both fill inner width => delta 0

    // No horizontal overflow
    const noOverflow = dsw <= vw + 1 && bsw <= vw + 1;

    // Check marquee not causing overflow: its container overflow hidden
    const marquee = qs('[data-testid="marquee"]');
    const marqueeCS = marquee ? cs(marquee) : null;
    const marqueeRect = rect(marquee);

    // Title neon check
    const title = qs('[data-testid="post-title"]');
    const titleCS = title ? cs(title) : null;

    // Check retro-box
    const retroBox = qs('.retro-box');
    const retroBoxCS = retroBox ? cs(retroBox) : null;

    // Sidebar width check at desktop should be ~300
    let sidebarWidthOk = null;
    if (sidebarRect && vw >= 1024) {
      // lg breakpoint is 1024, grid has sidebar 300
      sidebarWidthOk = Math.abs(sidebarRect.w - 300) < 2.5;
    }

    // Posts column width at desktop = grid width - gap - sidebar
    let postsColWidthExpected = null;
    let postsColWidthOk = null;
    if (vw >= 1024 && gridRect && sidebarRect) {
      const gapPx = parseFloat(gridCS.gap) || 24;
      postsColWidthExpected = gridRect.w - gapPx - 300;
      postsColWidthOk = Math.abs(postsColRect.w - postsColWidthExpected) < 3;
    }

    // Card inside column: at desktop card w should equal postsCol width (w-full)
    let cardsInsideColOk = null;
    if (vw >= 1024 && postsColRect) {
      cardsInsideColOk = cardMetrics.every(cm => Math.abs(cm.rect.w - postsColRect.w) < 2 );
    }
    // At mobile, card w == grid w (single col)
    let cardsFullWidthMobileOk = null;
    if (vw < 1024 && gridRect) {
      cardsFullWidthMobileOk = cardMetrics.every(cm => Math.abs(cm.rect.w - gridRect.w) < 2.5);
    }

    // Check every element does not exceed viewport
    const allEls = Array.from(document.querySelectorAll('[data-testid]'));
    const overflowing = allEls.map(el => {
      const r = el.getBoundingClientRect();
      return { testId: el.getAttribute('data-testid'), w: Math.round(r.width*10)/10, right: Math.round(r.right*10)/10, left: Math.round(r.left*10)/10, overflowRight: r.right > vw + 1, overflowLeft: r.left < -1 };
    }).filter(o => o.overflowRight || o.overflowLeft);

    // Check grid centered: mx-auto => margin auto, grid left roughly equal to (vw - grid.w)/2 ??? But outer has padding, so not exactly viewport centered. Check grid is centered inside main/outer.
    // Better: outer padding 12 each side, outer width capped 896, grid max 872 and mx-auto inside main which is width = outer -24 = header width.
    // So grid left should equal header left, and right equals header right (if both 872). That's our headerGridDelta check.

    // Max-width values
    const gridMaxIs872 = gridCS ? (gridCS.maxWidth === "872px" || gridCS.maxWidth === "872px" ) : false;
    // Actually tailwind JIT: max-w-[872px] => max-width:872px
    const cardsMaxAre872 = cardMetrics.every(cm => cm.computed && cm.computed.maxWidth === "872px");

    // Tappable targets: retro-btn min height? Check
    const btns = qsa('.retro-btn');
    const btnTappable = btns.map(b => {
      const r = b.getBoundingClientRect();
      return { text: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), tappable: r.height >= 44 || r.width >= 44 };
    });

    return {
      viewport: { w: vw, h: vh },
      cssLoaded: document.styleSheets.length,
      docScrollWidth: dsw,
      bodyScrollWidth: bsw,
      noHorizontalOverflow: noOverflow,
      outer: outer ? { rect: outerRect, maxWidth: outerCS.maxWidth, width: outerCS.width, marginLeft: outerCS.marginLeft, marginRight: outerCS.marginRight, paddingLeft: outerCS.paddingLeft, paddingRight: outerCS.paddingRight, boxSizing: outerCS.boxSizing } : null,
      header: header ? { rect: headerRect, width: headerCS.width, maxWidth: headerCS.maxWidth } : null,
      main: main ? { rect: mainRect } : null,
      grid: grid ? { rect: gridRect, computed: gridChecks } : null,
      postsCol: postsCol ? { rect: postsColRect } : null,
      sidebar: sidebar ? { rect: sidebarRect, computedWidth: sidebarCS ? sidebarCS.width : null } : null,
      footer: footer ? { rect: footerRect } : null,
      cards: cardMetrics,
      headerGridDelta,
      headerGridAligned: headerGridDelta !== null ? headerGridDelta < 2 : null,
      gridMaxIs872,
      cardsMaxAre872,
      sidebarWidthOk,
      postsColWidthExpected,
      postsColWidthOk,
      cardsInsideColOk,
      cardsFullWidthMobileOk,
      overflowing,
      marquee: marquee ? { rect: marqueeRect, overflow: marqueeCS.overflow, overflowX: marqueeCS.overflowX, whiteSpace: marqueeCS.whiteSpace } : null,
      titleNeon: titleCS ? { textShadow: titleCS.textShadow, color: titleCS.color } : null,
      retroBox: retroBoxCS ? { border: retroBoxCS.border, borderTopWidth: retroBoxCS.borderTopWidth, backgroundImage: retroBoxCS.backgroundImage, boxShadow: retroBoxCS.boxShadow, borderRadius: retroBoxCS.borderRadius } : null,
      tappable: btnTappable,
      allOverflowingCount: overflowing.length,
    };
  });

  console.log(`\n=== ${name} ${viewport.width}x${viewport.height} ===`);
  console.log(JSON.stringify(metrics, null, 2));

  // Screenshot full page? Use fullPage true for home, but also viewport
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
  console.log(`Screenshot ${name}.png -> fullPage`);

  // Also viewport-only screenshot for comparison? Not needed but helpful
  // Take second screenshot without fullPage for strict viewport
  // We'll keep the fullPage one as required.

  await browser.close();
  return { name, viewport, metrics, cssLoaded };
}

let results = [];

// Test desktop 1280
results.push(await measure({ width: 1280, height: 800 }, "home-desktop"));

// Test mobile 375
results.push(await measure({ width: 375, height: 812 }, "home-mobile"));

// Additional: 360 for sanity
results.push(await measure({ width: 360, height: 800 }, "home-mobile-360"));

// Also test tablet 768? Not required but nice
results.push(await measure({ width: 768, height: 800 }, "home-tablet-768"));

const summary = {
  generatedAt: new Date().toISOString(),
  branch: "fix/posts-max-width-872",
  description: "Validate posts grid and PostCard max-w 872 centered, header alignment, no overflow, mobile/desktop",
  expectations: {
    gridMaxWidth: "872px",
    postCardMaxWidth: "872px",
    centered: "mx-auto",
    noHorizontalOverflow: true,
    headerGridAligned: "delta <2px at all viewports",
    desktopGrid: "max 872, centered, gap-6, sidebar 300, posts col ~548",
    mobile: "full width minus px-3*2, no overflow, max 872 not exceeding viewport"
  },
  results
};

fs.writeFileSync(path.join(screenshotDir, "metrics.json"), JSON.stringify(summary, null, 2));
console.log("\nMetrics written to metrics.json");
console.log(JSON.stringify(summary, null, 2));
