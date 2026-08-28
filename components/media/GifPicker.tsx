"use client";

import { useRef, useState } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import type { IGif } from "@giphy/js-types";
import { curatedGifs } from "@/lib/gifs";

interface GifPickerProps {
  onSelect: (src: string) => void;
  onClose: () => void;
}

const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_KEY;

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [tab, setTab] = useState<"retro" | "search">("retro");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IGif[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const giphyDisabled = !GIPHY_KEY;

  function searchGiphy(term: string) {
    if (!GIPHY_KEY || term.trim() === "") {
      setResults([]);
      return;
    }

    const id = ++requestIdRef.current;
    setSearching(true);
    setError(null);

    const gf = new GiphyFetch(GIPHY_KEY);
    gf.search(term, { limit: 24 })
      .then((res) => {
        if (id === requestIdRef.current) setResults(res.data);
      })
      .catch(() => {
        if (id === requestIdRef.current) {
          setError("La recherche Giphy a échoué. Réessaie !");
          setResults([]);
        }
      })
      .finally(() => {
        if (id === requestIdRef.current) setSearching(false);
      });
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    setDebounceTimer(setTimeout(() => searchGiphy(value), 400));
  }

  return (
    <div className="retro-box w-full max-w-md">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            className={`retro-btn ${tab === "retro" ? "" : "opacity-60"}`}
            onClick={() => setTab("retro")}
          >
            Rétro
          </button>
          <button
            type="button"
            className={`retro-btn ${tab === "search" ? "" : "opacity-60"}`}
            onClick={() => setTab("search")}
            disabled={giphyDisabled}
            title={giphyDisabled ? "Clé Giphy manquante" : undefined}
          >
            Recherche
          </button>
        </div>
        <button type="button" className="retro-btn" onClick={onClose}>
          Fermer ✕
        </button>
      </div>

      {tab === "retro" ? (
        <div className="grid grid-cols-3 gap-3">
          {curatedGifs.map((src) => (
            <button key={src} type="button" className="retro-btn p-1" onClick={() => onSelect(src)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="Gif rétro"
                className="h-20 w-full object-contain"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : giphyDisabled ? (
        <p className="text-sm opacity-80">
          Pas de clé Giphy configurée (NEXT_PUBLIC_GIPHY_KEY) — seuls les gifs rétro sont
          disponibles.
        </p>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Cherche un gif… (ex: étoiles)"
            className="w-full rounded-lg border-2 border-[var(--sky-hotpink)] bg-black/40 px-3 py-2 text-sm text-white outline-none"
          />
          {searching && <p className="text-sm blink">Recherche…</p>}
          {error && <p className="text-sm text-[#ff8080]">{error}</p>}
          {!searching && results.length === 0 && query !== "" && !error && (
            <p className="text-sm opacity-80">Aucun résultat.</p>
          )}
          {results.length > 0 && (
            <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
              {results.map((gif) => {
                const src = gif.images.preview_gif?.url ?? gif.images.fixed_height?.url;
                if (!src) return null;
                return (
                  <button
                    key={gif.id}
                    type="button"
                    className="retro-btn p-0.5"
                    onClick={() => onSelect(src)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={gif.title || "Gif Giphy"}
                      className="h-16 w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
