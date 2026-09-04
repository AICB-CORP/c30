import { chromium } from "playwright";

function htmlNewWithCarousel() {
  return `
  <div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-3 py-4" data-testid="site-outer">
    <header class="retro-pink-box mb-6 text-center" data-testid="header"><h1 class="retro-title">★ Skyblog des 30 ans ★</h1></header>
    <main class="flex-1" data-testid="main">
      <div class="mx-auto grid w-full max-w-[872px] gap-6 lg:grid-cols-[1fr_300px]" data-testid="posts-grid">
        <div data-testid="posts-col">
          <article class="retro-box mx-auto mb-5 w-full max-w-[872px]" data-testid="postcard-1">
            <div class="post-content">
              <p>Test</p>
              <div class="retro-carousel" data-testid="carousel"><img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='280' height='200'><rect width='100%' height='100%' fill='red'/></svg>`)}" /><img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='280' height='200'><rect width='100%' height='100%' fill='blue'/></svg>`)}" /><img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='280' height='200'><rect width='100%' height='100%' fill='green'/></svg>`)}" /></div>
            </div>
          </article>
        </div>
        <aside data-testid="sidebar" class="space-y-4"><div class="retro-box">sidebar</div></aside>
      </div>
    </main>
  </div>`;
}
function htmlNewWithCarouselMin0() {
  return `
  <div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-3 py-4" data-testid="site-outer">
    <header class="retro-pink-box mb-6 text-center" data-testid="header"><h1 class="retro-title">★ Skyblog des 30 ans ★</h1></header>
    <main class="flex-1" data-testid="main">
      <div class="mx-auto grid w-full max-w-[872px] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]" data-testid="posts-grid">
        <div data-testid="posts-col" class="min-w-0">
          <article class="retro-box mx-auto mb-5 w-full max-w-[872px] min-w-0" style="min-width:0" data-testid="postcard-1">
            <div class="post-content" style="min-width:0">
              <p>Test</p>
              <div class="retro-carousel" data-testid="carousel"><img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='280' height='200'><rect width='100%' height='100%' fill='red'/></svg>`)}" /><img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='280' height='200'><rect width='100%' height='100%' fill='blue'/></svg>`)}" /><img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='280' height='200'><rect width='100%' height='100%' fill='green'/></svg>`)}" /></div>
            </div>
          </article>
        </div>
        <aside data-testid="sidebar" class="space-y-4"><div class="retro-box">sidebar</div></aside>
      </div>
    </main>
  </div>`;
}

async function test(html, name, viewport) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/login", { waitUntil:"domcontentloaded", timeout:8000});
  await page.waitForTimeout(500);
  await page.evaluate(h=>{document.body.innerHTML=h; document.body.className="min-h-full";}, html);
  await page.waitForTimeout(500);
  const m = await page.evaluate(()=>{
    const vw=window.innerWidth, dsw=document.documentElement.scrollWidth;
    const grid=document.querySelector('[data-testid="posts-grid"]');
    const col=document.querySelector('[data-testid="posts-col"]');
    const carousel=document.querySelector('[data-testid="carousel"]');
    return {
      vw, dsw, overflow:dsw>vw+1,
      gridW: grid.getBoundingClientRect().width,
      gridCols: getComputedStyle(grid).gridTemplateColumns,
      colW: col.getBoundingClientRect().width,
      carW: carousel.getBoundingClientRect().width,
      carScrollW: carousel.scrollWidth,
      carClientW: carousel.clientWidth,
    };
  });
  console.log(`\n=== ${name} ${viewport.width}x${viewport.height} ===`, m);
  await browser.close();
}
for(let vp of [{width:1280,height:800},{width:375,height:812},{width:768,height:800}]){
  await test(htmlNewWithCarousel(), "NEW+carousel", vp);
  await test(htmlNewWithCarouselMin0(), "NEW+carousel+min0", vp);
}
