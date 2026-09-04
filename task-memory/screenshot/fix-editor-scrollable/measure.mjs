import { chromium } from "playwright";
import path from "path";

const inlineCss = `
  :root { --sky-pink:#ff69b4; --sky-hotpink:#ff1493; --sky-purple:#8b00ff; --sky-blue:#00bfff; --sky-black:#0d0011; --sky-white:#fff8fb; --font-retro-cursive:"Dancing Script",cursive; }
  *{box-sizing:border-box} html,body{margin:0;padding:0;background:#0d0011;color:#fff8fb;font-family:"Comic Sans MS",cursive,sans-serif}
  .fixed{position:fixed}.inset-0{inset:0}.z-50{z-index:50}.flex{display:flex}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}.items-center{align-items:center}.justify-center{justify-content:center}.justify-between{justify-content:space-between}
  .gap-1{}.gap-1\\.5{gap:0.375rem}.gap-2{gap:0.5rem}.overflow-hidden{overflow:hidden}.overflow-y-auto{overflow-y:auto}.overflow-x-hidden{overflow-x:hidden}
  .bg-black\\/80{background:rgba(0,0,0,0.8)} .p-2{padding:0.5rem}.p-1{padding:0.25rem}
  .mb-2{margin-bottom:0.5rem}.mb-3{margin-bottom:0.75rem}
  .w-\\[95vw\\]{width:95vw}.max-w-3xl{max-width:48rem}.max-h-\\[90vh\\]{max-height:90vh}.max-h-\\[45vh\\]{max-height:45vh}.min-h-\\[180px\\]{min-height:180px}.min-h-0{min-height:0}.flex-1{flex:1 1 0%}
  .w-full{width:100%}.rounded-lg{border-radius:0.5rem}.border-2{border-width:2px}
  .text-xs{font-size:0.75rem}.text-sm{font-size:0.875rem}.text-2xl{font-size:1.5rem}.opacity-70{opacity:0.7}.opacity-80{opacity:0.8}.ml-auto{margin-left:auto}.self-center{align-self:center}.h-3{height:0.75rem}.w-3{width:0.75rem}
  @media(min-width:768px){.md\\:max-h-\\[50vh\\]{max-height:50vh}}
  .retro-box{background:linear-gradient(180deg,#2a0a3d 0%,#16042a 100%);border:3px ridge #ff1493;border-radius:12px;box-shadow:0 0 12px rgba(255,20,147,0.45),inset 0 0 18px rgba(255,105,180,0.15);padding:1rem}
  .retro-title{font-family:var(--font-retro-cursive),"Dancing Script",cursive;font-size:2.2rem;text-shadow:0 0 8px #ff1493,0 0 16px #ff1493,0 0 32px #8b00ff;color:#fff}
  .neon-pink{color:#fff;text-shadow:0 0 5px #ff69b4,0 0 10px #ff69b4,0 0 20px #ff1493,0 0 40px #ff1493}
  .retro-btn{display:inline-block;padding:0.5rem 1.25rem;border:3px outset #ffb6d9;border-radius:999px;background:linear-gradient(180deg,#ff1493,#a0005e);color:#fff;font-weight:bold;text-shadow:1px 1px 2px rgba(0,0,0,0.6);box-shadow:0 0 10px rgba(255,20,147,0.5);cursor:pointer}
  .retro-btn.tool-btn{padding:0.25rem 0.6rem;font-size:0.8rem;border:3px outset #ffb6d9;box-shadow:2px 2px 4px rgba(0,0,0,0.4),0 0 8px rgba(255,20,147,0.3);transition:all 0.08s ease}
  .retro-carousel{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:0.75rem;padding:0.75rem;margin:0.75rem 0;border:3px ridge #ff69b4;border-radius:12px;background:linear-gradient(180deg,#1a001a 0%,#0d0011 100%);max-width:100%;box-sizing:border-box}
  .retro-carousel img{flex:0 0 auto;width:min(280px,70vw);height:clamp(140px,38vw,200px);object-fit:cover;scroll-snap-align:start;border:2px solid #ff69b4;border-radius:8px;margin:0}
  @media(max-width:640px){.retro-carousel{gap:0.5rem;padding:0.5rem}.retro-title{font-size:1.6rem}.retro-box{padding:0.75rem}}
  .editor-area .tiptap{min-height:180px;padding:0.75rem;outline:none}
  .editor-area .tiptap p{margin:0.25rem 0}
  .editor-area .tiptap img{max-width:100%;border-radius:8px}
  .editor-area .tiptap .retro-carousel{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:0.75rem;padding:0.75rem;margin:0.75rem 0;border:3px ridge #ff69b4;border-radius:12px;background:linear-gradient(180deg,#1a001a 0%,#0d0011 100%);max-width:100%;box-sizing:border-box}
  .editor-area .tiptap .retro-carousel img{flex:0 0 auto;width:min(280px,70vw);height:clamp(140px,38vw,200px);object-fit:cover;scroll-snap-align:start;border:2px solid #ff69b4;border-radius:8px}
  .title-input{width:100%;border-radius:0.5rem;border:2px solid #ff69b4;background:rgba(0,0,0,0.6);padding:0.5rem 0.75rem;color:white;outline:none}
  .toolbar-box{border-radius:0.5rem;border:2px solid rgba(255,105,180,0.6);background:rgba(0,0,0,0.4);padding:0.5rem}
`;
function svg(c, w = 280, h = 200, t = "img") {
  const s = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><rect width='100%' height='100%' fill='${c}'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='white'>${t}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
}
const colors = ["#ff69b4", "#8b00ff", "#00bfff", "#ffd700", "#00ff88", "#ff1493"];
function html({ many, carousel, count = 10 }) {
  let inner = `<p>Raconte ta meilleure histoire…</p>`;
  if (many) {
    if (carousel) {
      const imgs = Array.from(
        { length: count },
        (_, i) =>
          `<img src="${svg(colors[i % colors.length], 280, 200, `photo ${i + 1}`)}" alt="">`,
      ).join("");
      const car = `<div class="retro-carousel" data-carousel="true">${imgs}</div>`;
      inner =
        `<p>Voici mes photos pref ★ (carrousel ${count} images)</p>${car}<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.</p>` +
        Array.from(
          { length: 6 },
          (_, i) =>
            `<img src="${svg(colors[(i + 3) % colors.length], 400, 250, `extra ${i + 1}`)}" alt="">`,
        ).join("") +
        `<p>Encore du texte pour pousser la hauteur au delà de 45vh.</p>`;
    } else {
      inner =
        `<p>10 photos en vrac</p>` +
        Array.from(
          { length: count },
          (_, i) =>
            `<img src="${svg(colors[i % colors.length], 400, 220, `img ${i + 1}`)}" alt="">`,
        ).join("") +
        `<p>Fin du post</p>`;
    }
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${inlineCss}</style></head><body>
<div class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/80 p-2" data-testid="modal-outer">
<div class="retro-box flex w-[95vw] max-w-3xl max-h-[90vh] flex-col overflow-hidden" data-testid="retro-box">
<div class="mb-3 flex flex-wrap items-center justify-between gap-2" data-testid="header"><h3 class="neon-pink retro-title text-2xl">✏️ Nouveau post</h3><button type="button" class="text-sm opacity-70" style="background:none;border:none;color:white">✖ Fermer</button></div>
<input type="text" placeholder="Titre…" class="title-input mb-3" data-testid="title"/>
<div class="mb-3 flex gap-2" data-testid="privacy"><button class="retro-btn tool-btn">🌍 Public</button><button class="retro-btn tool-btn">🔒 Privé</button><span class="ml-auto self-center text-xs opacity-70">Privé = visible seulement</span></div>
<div class="mb-2 toolbar-box" data-testid="toolbar"><div class="flex flex-wrap items-center gap-1.5">
<button class="retro-btn tool-btn">B</button><button class="retro-btn tool-btn">I</button><button class="retro-btn tool-btn">U</button><button class="retro-btn tool-btn">S</button><button class="retro-btn tool-btn">H1</button><button class="retro-btn tool-btn">H2</button><button class="retro-btn tool-btn">• Liste</button><button class="retro-btn tool-btn">1. Liste</button>
<input type="color" value="#FF69B4" style="height:28px;width:36px;border:2px solid #ffb6d9;background:transparent">
<button style="height:20px;width:20px;border-radius:999px;background:#FF69B4;border:1px solid rgba(255,255,255,0.5)"></button><button style="height:20px;width:20px;border-radius:999px;background:#8B00FF;border:1px solid rgba(255,255,255,0.5)"></button><button style="height:20px;width:20px;border-radius:999px;background:#00BFFF;border:1px solid rgba(255,255,255,0.5)"></button>
<select class="retro-btn tool-btn"><option>Police</option></select><select class="retro-btn tool-btn"><option>Taille</option></select>
<button class="retro-btn tool-btn">⬅</button><button class="retro-btn tool-btn">⬌</button><button class="retro-btn tool-btn">➡</button>
<button class="retro-btn tool-btn">🔗</button><button class="retro-btn tool-btn">🎵</button><button class="retro-btn tool-btn">▶️</button>
<button class="retro-btn tool-btn">⚡ Néon</button><button class="retro-btn tool-btn">✨ Arc-en-ciel</button><button class="retro-btn tool-btn">📜 Défilant</button><button class="retro-btn tool-btn">💫 Clignotant</button><button class="retro-btn tool-btn">🔍 Flou</button>
<button class="retro-btn tool-btn">⚙️ HTML</button>
</div></div>
<div class="mb-2 flex flex-wrap gap-1.5" data-testid="media-row"><div class="flex items-center gap-1.5"><button class="retro-btn tool-btn">🖼️ Photos</button><label class="flex items-center gap-1 text-xs opacity-80"><input type="checkbox" checked class="h-3 w-3"> Carrousel</label></div><button class="retro-btn tool-btn">🎬 Vidéo</button><button class="retro-btn tool-btn">🎵 Son</button><button class="retro-btn tool-btn">💬 GIF</button><button class="retro-btn tool-btn">🎙 Voix</button></div>
<div class="editor-area mb-2 flex min-h-[180px] flex-1 flex-col overflow-hidden rounded-lg" style="border:2px solid rgba(255,105,180,0.3);background:rgba(0,0,0,0.2)" data-testid="editor-area"><div class="max-h-[45vh] min-h-[180px] flex-1 overflow-y-auto overflow-x-hidden p-1 md:max-h-[50vh]" data-testid="editor-scroll"><div class="tiptap" data-testid="tiptap">${inner}</div></div></div>
<div class="flex gap-2" data-testid="publish-row"><button class="retro-btn" data-testid="publish-btn">💾 Publier</button><button class="retro-btn">Annuler</button></div>
</div></div></body></html>`;
}
async function run(viewport, name) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.setContent(
    html({
      many: name.includes("many"),
      carousel: name.includes("many") && !name.includes("stacked"),
      count: 10,
    }),
    { waitUntil: "load" },
  );
  await page.waitForTimeout(200);
  const m = await page.evaluate(() => {
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
        rects[id] = { h: r.height, y: r.y, bottom: r.bottom, w: r.width };
      }
    }
    const box = document.querySelector('[data-testid="retro-box"]');
    const r = box.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const scroll = document.querySelector('[data-testid="editor-scroll"]');
    return {
      rects,
      box: { h: r.height, y: r.y, bottom: r.bottom, w: r.width },
      vh,
      vw,
      scroll: {
        h: scroll.getBoundingClientRect().height,
        scrollHeight: scroll.scrollHeight,
        clientHeight: scroll.clientHeight,
        maxHeight: getComputedStyle(scroll).maxHeight,
      },
      totalFixed: Object.values(rects)
        .filter((_, i) => ids[i] !== "editor-area" && ids[i] !== "editor-scroll")
        .reduce((s, v) => s + v.h, 0),
    };
  });
  console.log(`\n--- ${name} ${viewport.width}x${viewport.height} ---`);
  console.log(JSON.stringify(m, null, 2));
  await browser.close();
}
await run({ width: 1280, height: 800 }, "empty-desktop");
await run({ width: 375, height: 812 }, "empty-mobile");
await run({ width: 1280, height: 800 }, "many-desktop");
await run({ width: 375, height: 812 }, "many-mobile");
await run({ width: 360, height: 800 }, "empty-360");
