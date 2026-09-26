import { chromium } from "playwright";
import path from "path";
const dir = path.resolve("task-memory/screenshot/fix-posts-max-width-872");

function htmlWithCarousel() {
  return `
  <div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-3 py-4" data-testid="site-outer">
    <header class="retro-pink-box mb-6 text-center" data-testid="header">
      <h1 class="retro-title">★ Skyblog des 30 ans ★</h1>
      <div class="marquee mt-2 text-sm opacity-90"><span>♥ bienvenue sur le blog le plus 2006 du monde ♥ néons ♥ gifs ♥ marquee ♥</span></div>
      <nav class="mt-4 flex flex-wrap items-center justify-center gap-2"><a class="retro-btn">🏠 Accueil</a><a class="retro-btn">💬 Le Blab</a></nav>
    </header>
    <main class="flex-1" data-testid="main">
      <div class="mx-auto grid w-full max-w-[872px] gap-6 lg:grid-cols-[1fr_300px]" data-testid="posts-grid">
        <div data-testid="posts-col">
          <article class="retro-box mx-auto mb-5 w-full max-w-[872px]" data-testid="postcard">
            <h2 class="neon-pink retro-title mt-3 text-2xl">Post avec carrousel (3 images)</h2>
            <div class="post-content mt-3">
              <p>Test carousel overflow — this should not cause horizontal scroll but currently does.</p>
              <div class="retro-carousel" data-testid="carousel">
                <img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='280' height='200'><rect width='100%' height='100%' fill='#ff69b4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white'>1</text></svg>`)}" alt="" />
                <img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='280' height='200'><rect width='100%' height='100%' fill='#8b00ff'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white'>2</text></svg>`)}" alt="" />
                <img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='280' height='200'><rect width='100%' height='100%' fill='#00bfff'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white'>3</text></svg>`)}" alt="" />
              </div>
            </div>
          </article>
        </div>
        <aside class="space-y-4 self-start lg:sticky lg:top-4" data-testid="sidebar">
          <div class="retro-box"><h3>⏰ J-45</h3></div><div class="retro-box">HitCounter</div>
        </aside>
      </div>
    </main>
    <footer class="mt-10 text-center text-sm opacity-70">Fait avec ♥</footer>
  </div>`;
}

async function run(vp, name) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded", timeout: 8000 });
  await page.waitForTimeout(500);
  await page.evaluate((h) => {
    document.body.innerHTML = h;
    document.body.className = "min-h-full sparkle-cursor";
  }, htmlWithCarousel());
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => {
    const vw = window.innerWidth,
      dsw = document.documentElement.scrollWidth;
    const grid = document.querySelector('[data-testid="posts-grid"]');
    const col = document.querySelector('[data-testid="posts-col"]');
    const carousel = document.querySelector('[data-testid="carousel"]');
    return {
      vw,
      dsw,
      overflow: dsw > vw + 1,
      gridW: grid.getBoundingClientRect().width,
      gridCols: getComputedStyle(grid).gridTemplateColumns,
      colW: col.getBoundingClientRect().width,
      carW: carousel.getBoundingClientRect().width,
      carScrollW: carousel.scrollWidth,
      carClientW: carousel.clientWidth,
    };
  });
  console.log(`${name} ${vp.width}x${vp.height}`, m);
  await page.screenshot({ path: path.join(dir, name + ".png"), fullPage: true });
  console.log(`saved ${name}.png`);
  await browser.close();
  return m;
}

await run({ width: 1280, height: 800 }, "home-carousel-desktop");
await run({ width: 375, height: 812 }, "home-carousel-mobile");
await run({ width: 768, height: 800 }, "home-carousel-tablet");
