const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "youtu.be",
  "m.youtube.com",
  "www.youtube.com",
  "music.youtube.com",
  "open.spotify.com",
  "spotify.com",
]);

const OEMBED_ENDPOINTS: Record<"youtube" | "spotify", (url: string) => string> = {
  youtube: (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  spotify: (url) => `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
};

interface OEmbedPayload {
  type: "video" | "music" | "link";
  title?: string;
  html: string | null;
}

function getHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isAllowedHost(hostname: string | null): hostname is string {
  return hostname !== null && ALLOWED_HOSTS.has(hostname);
}

function extractIframeSrc(html: string): string | null {
  const match = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  let url: string;
  try {
    const body = (await request.json()) as { url?: unknown };
    if (typeof body.url !== "string" || body.url.trim() === "") {
      return Response.json({ error: "Champ 'url' manquant" }, { status: 400 });
    }
    url = body.url.trim();
  } catch {
    return Response.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const host = getHost(url);
  if (!isAllowedHost(host)) {
    return Response.json({ type: "link", title: url, html: null } satisfies OEmbedPayload);
  }

  const provider = host.includes("youtube") || host.includes("youtu.be") ? "youtube" : "spotify";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(OEMBED_ENDPOINTS[provider](url), {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return Response.json({ type: "link", title: url, html: null } satisfies OEmbedPayload);
    }

    const data = (await res.json()) as { title?: unknown; html?: unknown };

    if (typeof data.html !== "string") {
      return Response.json({ type: "link", title: url, html: null } satisfies OEmbedPayload);
    }

    const src = extractIframeSrc(data.html);
    if (!src || !isAllowedHost(getHost(src))) {
      return Response.json({ type: "link", title: url, html: null } satisfies OEmbedPayload);
    }

    return Response.json({
      type: provider === "youtube" ? "video" : "music",
      title: typeof data.title === "string" ? data.title : undefined,
      html: data.html,
    } satisfies OEmbedPayload);
  } catch {
    return Response.json({ type: "link", title: url, html: null } satisfies OEmbedPayload);
  } finally {
    clearTimeout(timeout);
  }
}
