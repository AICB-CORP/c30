"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/config";

function diffParts(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return { days, hours, minutes };
}

export default function Countdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const revealed = now >= siteConfig.birthday.getTime();

  if (revealed) {
    return (
      <div className="retro-box text-center">
        <div className="retro-title rainbow-text">JOYEUX ANNIVERSAIRE 🎉</div>
      </div>
    );
  }

  const { days, hours, minutes } = diffParts(siteConfig.birthday);

  return (
    <div className="retro-box text-center">
      <div className="neon-pink font-bold mb-2">Plus que</div>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="odometer text-lg">{days}</span>
        <span className="text-white">jours</span>
        <span className="odometer text-lg">{hours}</span>
        <span className="text-white">h</span>
        <span className="odometer text-lg">{minutes}</span>
        <span className="text-white">min</span>
      </div>
      <div className="text-white/70 mt-2 text-sm">avant les 30 ans !</div>
    </div>
  );
}
