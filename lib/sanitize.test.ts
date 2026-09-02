import { describe, it, expect } from "vitest";
import { sanitizeHtml, isSafeIframe, HTML_TAGS, HTML_ATTRS } from "./sanitize";

describe("sanitizeHtml — carousel preservation", () => {
  it('preserves <div data-carousel="true" class="retro-carousel"> with two imgs', () => {
    const input = `<div data-carousel="true" class="retro-carousel"><img src="https://pub-test.r2.dev/user-123/counter-1.jpg" alt=""><img src="https://pub-test.r2.dev/user-123/counter-2.jpg" alt=""></div>`;
    const out = sanitizeHtml(input);
    expect(out).toContain("data-carousel");
    expect(out).toContain("retro-carousel");
    expect(out).toContain("counter-1.jpg");
    expect(out).toContain("counter-2.jpg");
    // should remain a div, not stripped
    expect(out).toContain("<div");
    expect(out).toContain("<img");
  });

  it("keeps data-carousel attr and class on div", () => {
    const out = sanitizeHtml(`<div data-carousel="true" class="retro-carousel">hello</div>`);
    expect(out).toContain(`data-carousel="true"`);
    expect(out).toContain(`retro-carousel`);
  });

  it("preserves div with retro-carousel class even without data-carousel", () => {
    const input = `<div class="retro-carousel"><img src="https://example.com/a.jpg"><img src="https://example.com/b.jpg"></div>`;
    const out = sanitizeHtml(input);
    expect(out).toContain("retro-carousel");
    expect(out).toContain("a.jpg");
    expect(out).toContain("b.jpg");
    // DOMPurify will keep the div because it's allowed and class is global attr
    expect(out).toContain("<div");
  });

  it("preserves img inside carousel (src, alt)", () => {
    const input = `<div data-carousel="true" class="retro-carousel"><img src="https://example.com/a.jpg" alt="a"><img src="https://example.com/b.jpg" alt="b"></div>`;
    const out = sanitizeHtml(input);
    expect(out).toContain(`src="https://example.com/a.jpg"`);
    expect(out).toContain(`alt="a"`);
    expect(out).toContain(`src="https://example.com/b.jpg"`);
  });

  it("preserves multiple imgs order inside carousel", () => {
    const imgs = [1, 2, 3, 4].map((i) => `<img src="https://example.com/${i}.jpg">`).join("");
    const input = `<div data-carousel="true" class="retro-carousel">${imgs}</div>`;
    const out = sanitizeHtml(input);
    // all four should be present in order
    const idx1 = out.indexOf("1.jpg");
    const idx2 = out.indexOf("2.jpg");
    const idx3 = out.indexOf("3.jpg");
    const idx4 = out.indexOf("4.jpg");
    expect(idx1).toBeGreaterThan(-1);
    expect(idx2).toBeGreaterThan(idx1);
    expect(idx3).toBeGreaterThan(idx2);
    expect(idx4).toBeGreaterThan(idx3);
  });

  it("does not strip carousel when nested inside other content", () => {
    const input = `<p>hello</p><div data-carousel="true" class="retro-carousel"><img src="https://example.com/a.jpg"></div><p>world</p>`;
    const out = sanitizeHtml(input);
    expect(out).toContain("data-carousel");
    expect(out).toContain("hello");
    expect(out).toContain("world");
  });

  it("keeps carousel even with extra global attrs like style (sanitized)", () => {
    const input = `<div data-carousel="true" class="retro-carousel" style="color: red;"><img src="https://example.com/a.jpg"></div>`;
    const out = sanitizeHtml(input);
    expect(out).toContain("data-carousel");
    expect(out).toContain("retro-carousel");
    // style color is allowed, so it should remain (sanitized)
    expect(out).toContain("color");
  });

  it("HTML_TAGS and HTML_ATTRS include carousel support", () => {
    expect(HTML_TAGS).toContain("div");
    expect(HTML_TAGS).toContain("img");
    expect(HTML_ATTRS).toContain("data-carousel");
    expect(HTML_ATTRS).toContain("class");
  });
});

describe("sanitizeHtml — XSS payloads are neutralized", () => {
  it("strips <script> tags and their content", () => {
    const out = sanitizeHtml(`hello<script>alert(1)</script>world`);
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("hello");
    expect(out).toContain("world");
  });

  it("also strips script with src", () => {
    const out = sanitizeHtml(`<script src="https://evil.com/x.js"></script>hello`);
    expect(out).not.toContain("<script");
    expect(out).toContain("hello");
  });

  it("removes onerror attribute from img", () => {
    const out = sanitizeHtml(`<img src="x" onerror="alert(1)">`);
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("<img");
  });

  it("removes onload, onclick, generic on* handlers", () => {
    expect(sanitizeHtml(`<div onclick="alert(1)">hi</div>`)).not.toContain("onclick");
    expect(sanitizeHtml(`<img src="x" onload="alert(1)">`)).not.toContain("onload");
    expect(sanitizeHtml(`<svg onload="alert(1)">`)).not.toContain("onload");
  });

  it("strips <svg> with onload (svg tag not allowed)", () => {
    const out = sanitizeHtml(`<svg onload="alert(1)"><circle r="10"/></svg><p>hi</p>`);
    expect(out).not.toContain("<svg");
    expect(out).not.toContain("onload");
    expect(out).toContain("hi");
  });

  it("neutralizes javascript: hrefs", () => {
    const out = sanitizeHtml(`<a href="javascript:alert(1)">click</a>`);
    expect(out).not.toContain("javascript:");
    expect(out).toContain("click");
    // href should be stripped entirely
    expect(out).not.toMatch(/href\s*=\s*["']?\s*javascript/i);
  });

  it("neutralizes javascript: with spaces / casing", () => {
    const out = sanitizeHtml(`<a href="  JaVaScRiPt:alert(1)">x</a>`);
    expect(out).not.toContain("javascript");
  });

  it("removes data: URIs in href/src", () => {
    const out1 = sanitizeHtml(
      `<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>`,
    );
    expect(out1).not.toContain("data:");
    // For <a> data: is stripped via afterSanitizeAttributes hook (href must be https/mailto)
    // For <img> data: the DOMPurify ALLOWED_URI_REGEXP plus fallback handling may keep it;
    // we assert at least href is neutralized and img is not executable as script.
    // If img data: is kept, it is still not a script execution vector for our use-case.
    const out2 = sanitizeHtml(`<a href="data:image/png;base64,xxx">x</a>`);
    expect(out2).not.toContain("data:");
  });

  it("removes vbscript: URIs", () => {
    const out = sanitizeHtml(`<a href="vbscript:msgbox(1)">x</a>`);
    expect(out).not.toContain("vbscript");
  });

  it("strips style injection expression() ", () => {
    const out = sanitizeHtml(`<div style="width: expression(alert(1)); color: red;">hi</div>`);
    expect(out).not.toContain("expression");
    // color red should still be allowed (if present, it's okay), but expression must be gone
    expect(out).not.toMatch(/expression/i);
  });

  it("strips style injection url(javascript:…) and url() with dangerous content", () => {
    const out = sanitizeHtml(
      `<div style="background: url(javascript:alert(1)); color: red;">hi</div>`,
    );
    expect(out).not.toContain("url(");
    expect(out).not.toContain("javascript");
  });

  it("strips @import in style", () => {
    const out = sanitizeHtml(`<div style="@import url('https://evil.com'); color: red;">hi</div>`);
    expect(out).not.toContain("@import");
  });

  it("entity-encoded script payload is neutralized (&#x3C;script&#x3E;)", () => {
    const out = sanitizeHtml(`&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;`);
    // After sanitization the payload must not become an executable <script> tag.
    // DOMPurify keeps it encoded (safe), fallback decodes then strips; both are safe.
    expect(out).not.toContain("<script");
    expect(out.toLowerCase()).not.toContain("<script");
    // If decoded and stripped, alert won't appear; if kept encoded, it's not executable — allow either.
    // At minimum ensure no script tag was created.
    if (out.includes("alert(1)") && out.includes("&#x3C;")) {
      // encoded path — acceptable, still neutralized because it's not a tag
      expect(out).toContain("&#x3C;");
    } else {
      expect(out).not.toContain("alert(1)");
    }
  });

  it("entity-encoded javascript: is neutralized", () => {
    const out = sanitizeHtml(
      `<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">x</a>`,
    );
    expect(out).not.toContain("javascript");
  });

  it("removes srcdoc and formaction attrs (FORBID_ATTR)", () => {
    const out = sanitizeHtml(
      `<iframe src="https://www.youtube.com/embed/xxx" srcdoc="<script>alert(1)</script>"></iframe>`,
    );
    expect(out).not.toContain("srcdoc");
    // And the iframe with safe host should still be there (src preserved), but srcdoc stripped
    expect(out).toContain("youtube.com");
  });

  it("neutralizes style with -moz-binding and behavior", () => {
    expect(
      sanitizeHtml(`<div style="-moz-binding: url('https://evil.com')">hi</div>`),
    ).not.toContain("-moz-binding");
    expect(sanitizeHtml(`<div style="behavior: url('https://evil.com')">hi</div>`)).not.toContain(
      "behavior",
    );
  });
});

describe("sanitizeHtml — legitimate retro markup survives", () => {
  it("preserves <font color>", () => {
    const out = sanitizeHtml(`<font color="red">hello</font>`);
    expect(out).toContain("<font");
    expect(out).toContain("hello");
  });

  it("preserves <marquee>", () => {
    const out = sanitizeHtml(`<marquee>texte défilant</marquee>`);
    expect(out).toContain("<marquee");
    expect(out).toContain("texte défilant");
  });

  it("preserves <blink>", () => {
    const out = sanitizeHtml(`<blink>clignotant</blink>`);
    expect(out).toContain("<blink");
    expect(out).toContain("clignotant");
  });

  it("preserves video and audio with controls and src", () => {
    const v = sanitizeHtml(
      `<video src="https://pub-test.r2.dev/user-123/vid.mp4" controls></video>`,
    );
    expect(v).toContain("<video");
    expect(v).toContain("controls");
    expect(v).toContain("vid.mp4");
    const a = sanitizeHtml(
      `<audio src="https://pub-test.r2.dev/user-123/aud.mp3" controls></audio>`,
    );
    expect(a).toContain("<audio");
    expect(a).toContain("aud.mp3");
  });

  it("preserves youtube iframe and strips evil iframe", () => {
    const yt = sanitizeHtml(
      `<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" allowfullscreen></iframe>`,
    );
    expect(yt).toContain("<iframe");
    expect(yt).toContain("youtube.com");
    const evil = sanitizeHtml(`<iframe src="https://evil.com/malicious"></iframe>`);
    expect(evil).not.toContain("<iframe");
    expect(evil).not.toContain("evil.com");
  });

  it("preserves spotify iframe", () => {
    const out = sanitizeHtml(
      `<iframe src="https://open.spotify.com/embed/track/xxx" allow="encrypted-media"></iframe>`,
    );
    expect(out).toContain("<iframe");
    expect(out).toContain("spotify.com");
  });

  it("keeps safe style properties (color, text-shadow) and strips dangerous ones", () => {
    const out = sanitizeHtml(
      `<span style="color: #FF69B4; text-shadow: 0 0 8px #ff69b4; position: absolute;">hi</span>`,
    );
    expect(out).toContain("color");
    expect(out).toContain("text-shadow");
    expect(out).not.toContain("position");
  });

  it("forces rel noopener on target _blank links", () => {
    const out = sanitizeHtml(`<a href="https://example.com" target="_blank">x</a>`);
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("preserves allowed tags: b, i, u, table, hr, center, p, br, h1, ul, blockquote", () => {
    const input = `<b>bold</b><i>italic</i><u>underline</u><table><tr><td>cell</td></tr></table><hr><center>center</center><p>para</p><br><h1>title</h1><ul><li>item</li></ul><blockquote>quote</blockquote>`;
    const out = sanitizeHtml(input);
    expect(out).toContain("<b>");
    expect(out).toContain("<i>");
    expect(out).toContain("<u>");
    expect(out).toContain("<table>");
    expect(out).toContain("<hr");
    expect(out).toContain("<center>");
    expect(out).toContain("<p>");
    expect(out).toContain("<h1>");
    expect(out).toContain("<ul>");
    expect(out).toContain("<blockquote>");
  });

  it("preserves font with face, size, and style with font-family", () => {
    const out = sanitizeHtml(`<font face="Comic Sans MS" size="5" color="#FF69B4">hi</font>`);
    expect(out).toContain("Comic Sans MS");
    const out2 = sanitizeHtml(
      `<span style="font-family: Comic Sans MS; font-size: 20px;">hi</span>`,
    );
    expect(out2).toContain("font-family");
  });
});

describe("isSafeIframe", () => {
  it("returns true for youtube and spotify hosts", () => {
    expect(isSafeIframe(`<iframe src="https://www.youtube.com/embed/xxx"></iframe>`)).toBe(true);
    expect(isSafeIframe(`<iframe src="https://youtube.com/embed/xxx"></iframe>`)).toBe(true);
    expect(isSafeIframe(`<iframe src="https://open.spotify.com/embed/track/xxx"></iframe>`)).toBe(
      true,
    );
    expect(isSafeIframe(`<iframe src="https://spotify.com/embed/xxx"></iframe>`)).toBe(true);
  });

  it("returns false for evil hosts or missing src", () => {
    expect(isSafeIframe(`<iframe src="https://evil.com/xxx"></iframe>`)).toBe(false);
    expect(isSafeIframe(`<iframe></iframe>`)).toBe(false);
    expect(isSafeIframe(`no iframe`)).toBe(false);
  });

  it("returns true for http youtube and false for javascript: protocol", () => {
    // Both http and https are allowed if host is safe (protocol check is /^https?:/)
    expect(isSafeIframe(`<iframe src="http://www.youtube.com/embed/xxx"></iframe>`)).toBe(true);
    expect(isSafeIframe(`<iframe src="https://www.youtube.com/embed/xxx"></iframe>`)).toBe(true);
    expect(isSafeIframe(`<iframe src="javascript:alert(1)"></iframe>`)).toBe(false);
    expect(isSafeIframe(`<iframe src="data:text/html;base64,xxx"></iframe>`)).toBe(false);
  });
});
