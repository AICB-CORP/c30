import { chromium } from "playwright";

function htmlOld() {
  return `
  <div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-3 py-4" data-testid="site-outer">
    <header class="retro-pink-box mb-6 text-center" data-testid="header"><h1 class="retro-title">★ Skyblog des 30 ans ★</h1></header>
    <main class="flex-1" data-testid="main">
      <div class="grid gap-6 lg:grid-cols-[1fr_300px]" data-testid="posts-grid">
        <div data-testid="posts-col">
          <article class="retro-box mb-5" data-testid="postcard-1"><div class="post-content"><p>Test content with image</p><img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='800' height='400'><rect width='100%' height='100%' fill='red'/></svg>`)}" /></div></article>
        </div>
        <aside data-testid="sidebar" class="space-y-4"><div class="retro-box">sidebar</div></aside>
      </div>
    </main>
  </div>`;
}
function htmlNew() {
  return `
  <div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-3 py-4" data-testid="site-outer">
    <header class="retro-pink-box mb-6 text-center" data-testid="header"><h1 class="retro-title">★ Skyblog des 30 ans ★</h1></header>
    <main class="flex-1" data-testid="main">
      <div class="mx-auto grid w-full max-w-[872px] gap-6 lg:grid-cols-[1fr_300px]" data-testid="posts-grid">
        <div data-testid="posts-col">
          <article class="retro-box mx-auto mb-5 w-full max-w-[872px]" data-testid="postcard-1"><div class="post-content"><p>Test content with image</p><img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='800' height='400'><rect width='100%' height='100%' fill='red'/></svg>`)}" /></div></article>
        </div>
        <aside data-testid="sidebar" class="space-y-4"><div class="retro-box">sidebar</div></aside>
      </div>
    </main>
  </div>`;
}
function htmlNewMin0() {
  return `
  <div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-3 py-4" data-testid="site-outer">
    <header class="retro-pink-box mb-6 text-center" data-testid="header"><h1 class="retro-title">★ Skyblog des 30 ans ★</h1></header>
    <main class="flex-1" data-testid="main">
      <div class="mx-auto grid w-full max-w-[872px] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]" data-testid="posts-grid">
        <div data-testid="posts-col" class="min-w-0">
          <article class="retro-box mx-auto mb-5 w-full max-w-[872px] min-w-0" data-testid="postcard-1"><div class="post-content"><p>Test content with image</p><img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='800' height='400'><rect width='100%' height='100%' fill='red'/></svg>`)}" /></div></article>
        </div>
        <aside data-testid="sidebar" class="space-y-4 min-w-0"><div class="retro-box">sidebar</div></aside>
      </div>
    </main>
  </div>`;
}

async function testVariant(html, name, viewport) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded", timeout: 8000 });
  await page.waitForTimeout(600);
  await page.evaluate((h) => {
    document.body.innerHTML = h;
    document.body.className = "min-h-full";
  }, html);
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const qs = (s) => document.querySelector(s);
    const vw = window.innerWidth;
    const dsw = document.documentElement.scrollWidth;
    const grid = qs('[data-testid="posts-grid"]');
    const col = qs('[data-testid="posts-col"]');
    const card = qs('[data-testid="postcard-1"]');
    const outer = qs('[data-testid="site-outer"]');
    const header = qs('[data-testid="header"]');
    return {
      viewport: vw,
      dsw,
      overflow: dsw > vw + 1,
      gridW: grid.getBoundingClientRect().width,
      gridCols: getComputedStyle(grid).gridTemplateColumns,
      colW: col.getBoundingClientRect().width,
      cardW: card.getBoundingClientRect().width,
      cardMax: getComputedStyle(card).maxWidth,
      outerW: outer.getBoundingClientRect().width,
      headerW: header.getBoundingClientRect().width,
    };
  });
  console.log(`\n=== ${name} ${viewport.width}x${viewport.height} ===`);
  console.log(m);
  await browser.close();
  return m;
}

for (let vp of [
  { width: 1280, height: 800 },
  { width: 375, height: 812 },
  { width: 768, height: 800 },
]) {
  await testVariant(htmlOld(), "OLD", vp);
  await testVariant(htmlNew(), "NEW", vp);
  await testVariant(htmlNewMin0(), "NEW+minmax0", vp);
}
