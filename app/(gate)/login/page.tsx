"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="text-center">
      <h1 className="retro-title mb-1">★ Skyblog des 30 ans ★</h1>
      <p className="mb-6 text-sm opacity-90">🔐 Connexion réservée aux invités</p>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-bold">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border-2 border-white/40 bg-black/40 px-3 py-2 text-white outline-none focus:border-white"
            placeholder="toi@exemple.fr"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-bold">
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border-2 border-white/40 bg-black/40 px-3 py-2 pr-12 text-white outline-none focus:border-white"
              placeholder="••••••••"
            />
            <button
              type="button"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <span aria-hidden="true" className="text-base leading-none">
                {showPassword ? "🙈" : "👁️"}
              </span>
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border-2 border-red-400 bg-red-900/50 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="retro-btn w-full">
          {loading ? "Connexion…" : "🚀 Se connecter"}
        </button>
      </form>

      <p className="mt-6 text-sm">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-bold underline">
          Crée ton skyblog !
        </Link>
      </p>
    </div>
  );
}
