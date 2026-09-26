import { chromium } from "playwright";
import path from "path";
import fs from "fs";
const dir = path.resolve("task-memory/screenshot/fix-posts-max-width-872");

function cleanHomeHtml() {
  return `
  <div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-3 py-4" data-testid="site-outer">
    <header class="retro-pink-box mb-6 text-center" data-testid="header">
      <h1 class="retro-title">★ Skyblog des 30 ans ★</h1>
      <div class="marquee mt-2 text-sm opacity-90"><span>♥ bienvenue sur le blog le plus 2006 du monde ♥ néons ♥ gifs ♥ marquee ♥ messages d'amour ♥ compteur de visites ♥</span></div>
      <nav class="mt-4 flex flex-wrap items-center justify-center gap-2">
        <a class="retro-btn">🏠 Accueil</a><a class="retro-btn">💬 Le Blab</a><a class="retro-btn">👤 Mon profil</a><a class="retro-btn">⚙️ Mon compte</a>
      </nav>
      <p class="mt-3 text-xs opacity-90">Connecté : <span class="font-bold">@Bella-91</span></p>
    </header>
    <main class="flex-1" data-testid="main">
      <div class="mx-auto grid w-full max-w-[872px] gap-6 lg:grid-cols-[1fr_300px]" data-testid="posts-grid">
        <div data-testid="posts-col">
          <article class="retro-box mx-auto mb-5 w-full max-w-[872px]" data-testid="postcard-1">
            <div class="flex flex-wrap items-center justify-between gap-2"><a class="font-bold text-[#ff69b4]">@Bella-91</a><span class="text-xs opacity-80">il y a 2 jours</span></div>
            <h2 class="neon-pink retro-title mt-3 text-2xl">Ma plus belle soirée avec Caro ✨</h2>
            <div class="mt-1 text-xs font-bold"><span class="text-[#00ff88]">🌍 Public</span></div>
            <div class="post-content mt-3"><p>Caro, tu es la plus belle rencontre de 2008. <span class="neon-pink">Je t'aime fort</span> ♥ <span class="rainbow-text">magique</span> <span class="blink">✨</span></p><p>Long texte pour tester overflow-wrap et le rendu rétro. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.</p><img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='340'><rect width='100%' height='100%' fill='#ff69b4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white'>photo 600x340</text></svg>`)}" alt="" /></div>
          </article>
          <article class="retro-box mx-auto mb-5 w-full max-w-[872px]" data-testid="postcard-2">
            <div class="flex flex-wrap items-center justify-between gap-2"><a class="font-bold text-[#ff69b4]">@Ludo-92</a><span class="text-xs opacity-80">il y a 5 jours</span></div>
            <h2 class="neon-pink retro-title mt-3 text-2xl">Complices depuis 2004 💜</h2>
            <div class="mt-1 text-xs font-bold"><span class="text-[#ffd700]">🔒 Privé</span></div>
            <div class="post-content mt-3"><p>Deuxième post sans carrousel, juste image large.</p><img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='800' height='400'><rect width='100%' height='100%' fill='#8b00ff'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white'>image 800</text></svg>`)}" alt="" /></div>
          </article>
        </div>
        <aside class="space-y-4 self-start lg:sticky lg:top-4" data-testid="sidebar">
          <div class="retro-box"><h3 class="neon-pink font-bold">⏰ J-45</h3><div class="odometer">045</div></div>
          <div class="retro-box"><h3 class="font-bold">👁️ Visites</h3><div class="odometer">01234</div></div>
          <div class="retro-box"><h3 class="font-bold">🏆 Classement</h3><p class="text-sm">1. Bella-91 — 12</p></div>
          <div class="retro-box"><h3 class="font-bold">⭐ Best-of</h3><p class="text-sm">Carrousel</p></div>
        </aside>
      </div>
    </main>
    <footer class="mt-10 text-center text-sm opacity-70">Fait avec ♥, de 2006 à nos jours</footer>
  </div>`;
}

async function run(viewport, name) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded", timeout: 8000 });
  await page.waitForTimeout(500);
  await page.evaluate((h) => {
    document.body.innerHTML = h;
    document.body.className = "min-h-full sparkle-cursor";
  }, cleanHomeHtml());
  await page.waitForTimeout(600);
  const metrics = await page.evaluate(() => {
    const vw = window.innerWidth,
      dsw = document.documentElement.scrollWidth;
    const grid = document.querySelector('[data-testid="posts-grid"]');
    const col = document.querySelector('[data-testid="posts-col"]');
    const card = document.querySelector('[data-testid="postcard-1"]');
    const outer = document.querySelector('[data-testid="site-outer"]');
    const header = document.querySelector('[data-testid="header"]');
    return {
      vw,
      dsw,
      overflow: dsw > vw + 1,
      outerW: outer.getBoundingClientRect().width,
      outerMax: getComputedStyle(outer).maxWidth,
      headerW: header.getBoundingClientRect().width,
      gridW: grid.getBoundingClientRect().width,
      gridMax: getComputedStyle(grid).maxWidth,
      gridCols: getComputedStyle(grid).gridTemplateColumns,
      colW: col.getBoundingClientRect().width,
      cardW: card.getBoundingClientRect().width,
      cardMax: getComputedStyle(card).maxWidth,
    };
  });
  console.log(`\n=== CLEAN ${name} ${viewport.width}x${viewport.height} ===`, metrics);
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
  console.log(`saved ${name}.png`);
  await browser.close();
  return metrics;
}

await run({ width: 1280, height: 800 }, "home-desktop");
await run({ width: 375, height: 812 }, "home-mobile");
await run({ width: 360, height: 800 }, "home-mobile-360-clean");
await run({ width: 768, height: 800 }, "home-tablet-768-clean");

// Also test standalone PostCard outside grid (like post detail page)
async function standalone() {
  const html = `
  <div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-3 py-4">
    <header class="retro-pink-box mb-6 text-center"><h1 class="retro-title">★ Skyblog des 30 ans ★</h1></header>
    <main class="flex-1">
      <article class="retro-box mx-auto mb-5 w-full max-w-[872px]" data-testid="standalone-card"><h2 class="retro-title">Standalone post</h2><div class="post-content"><p>Post detail should be centered max 872</p></div></article>
    </main>
  </div>`;
  const viewports = [
    { width: 1280, height: 800 },
    { width: 375, height: 812 },
  ];
  for (let vp of viewports) {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3000/login", {
      waitUntil: "domcontentloaded",
      timeout: 8000,
    });
    await page.waitForTimeout(500);
    await page.evaluate((h) => {
      document.body.innerHTML = h;
    }, html);
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="standalone-card"]');
      const r = card.getBoundingClientRect();
      return {
        vw: window.innerWidth,
        dsw: document.documentElement.scrollWidth,
        cardW: r.width,
        cardMax: getComputedStyle(card).maxWidth,
        left: r.left,
        right: r.right,
        centered: Math.abs(window.innerWidth - r.width - r.left * 2) < 2,
      };
    });
    console.log(`standalone ${vp.width} =>`, m);
    await browser.close();
  }
}
await standalone();
