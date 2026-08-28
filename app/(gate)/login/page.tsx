"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border-2 border-white/40 bg-black/40 px-3 py-2 text-white outline-none focus:border-white"
            placeholder="••••••••"
          />
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
