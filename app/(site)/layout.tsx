import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/layout/LogoutButton";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, pseudo, avatar_url, bio, mood, skin, role, created_at")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-3 py-4">
      <header className="retro-pink-box mb-6 text-center">
        <h1 className="retro-title">★ Skyblog des 30 ans ★</h1>
        <div className="marquee mt-2 text-sm opacity-90">
          <span>
            ♥ bienvenue sur le blog le plus 2006 du monde ♥ néons ♥ gifs ♥ marquee ♥ messages
            d&apos;amour ♥ compteur de visites ♥
          </span>
        </div>
        <nav className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Link href="/" className="retro-btn">
            🏠 Accueil
          </Link>
          <Link href="/blab" className="retro-btn">
            💬 Le Blab
          </Link>
          <Link href={`/profil/${profile.pseudo}`} className="retro-btn">
            👤 Mon profil
          </Link>
          <Link href="/compte" className="retro-btn">
            ⚙️ Mon compte
          </Link>
          {profile.role === "birthday_girl" && (
            <Link href="/day" className="retro-btn">
              🎂 Jour J
            </Link>
          )}
          <LogoutButton />
        </nav>
        <p className="mt-3 text-xs opacity-90">
          Connecté : <span className="font-bold">@{profile.pseudo}</span>
          {profile.mood ? <span className="mood-chip"> {profile.mood}</span> : null}
        </p>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-10 text-center text-sm opacity-70">
        Fait avec ♥, de 2006 à nos jours
      </footer>

      <style>{`
        .mood-chip {
          display: inline-block;
          margin-left: 0.35rem;
          border: 1px solid #ff69b4;
          border-radius: 999px;
          padding: 0 0.5rem;
          font-size: 0.7rem;
          color: #fff;
          background: rgba(0, 0, 0, 0.45);
        }
      `}</style>
    </div>
  );
}
