"use client";

import { useEffect, useState } from "react";

export default function HitCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionStorage.getItem("hit-counted")) {
      sessionStorage.setItem("hit-counted", "1");
      fetch("/api/counter", { method: "POST" })
        .then((r) => r.json())
        .then((d) => setCount(d.count))
        .catch(() => setCount(null));
    } else {
      fetch("/api/counter")
        .then((r) => r.json())
        .then((d) => setCount(d.count))
        .catch(() => setCount(null));
    }
  }, []);

  return (
    <div className="retro-box text-center">
      <div className="text-white/70 text-sm mb-1">Tu es le visiteur N°</div>
      <span className="odometer text-xl">{count ?? "•••"}</span>
      <div className="text-white/50 text-xs mt-1">du skyblog le plus classe du monde</div>
    </div>
  );
}
