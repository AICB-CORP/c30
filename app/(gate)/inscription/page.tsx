"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function InscriptionPage() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pseudo, email, password, inviteCode }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Erreur lors de l'inscription.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      router.push("/login");
      return;
    }
    router.push("/");
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border-2 border-white/40 bg-black/40 px-3 py-2 text-white outline-none focus:border-white";

  return (
    <div className="text-center">
      <h1 className="retro-title mb-1">★ Skyblog des 30 ans ★</h1>
      <p className="mb-6 text-sm opacity-90">📝 Crée ton skyblog, invite exigée</p>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label htmlFor="pseudo" className="mb-1 block text-sm font-bold">
            Pseudo (ex. Bella-91)
          </label>
          <input
            id="pseudo"
            type="text"
            required
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            className={inputClass}
            placeholder="3-20 caractères : lettres, chiffres, _ ou -"
          />
        </div>
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
            className={inputClass}
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="8 caractères minimum"
          />
        </div>
        <div>
          <label htmlFor="inviteCode" className="mb-1 block text-sm font-bold">
            Code d&apos;invitation
          </label>
          <input
            id="inviteCode"
            type="text"
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className={inputClass}
            placeholder="BESTIE-7F3K"
          />
        </div>

        {error && (
          <p className="rounded-lg border-2 border-red-400 bg-red-900/50 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="retro-btn w-full">
          {loading ? "Création…" : "✨ Créer mon skyblog"}
        </button>
      </form>

      <p className="mt-6 text-sm">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-bold underline">
          Connecte-toi !
        </Link>
      </p>
    </div>
  );
}
