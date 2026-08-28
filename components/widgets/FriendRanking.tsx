interface Friend {
  pseudo: string;
  count: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function FriendRanking({ friends }: { friends: Friend[] }) {
  const top = [...friends].sort((a, b) => b.count - a.count).slice(0, 5);

  if (top.length === 0) {
    return (
      <div className="retro-box">
        <div className="neon-pink font-bold mb-2">Classement des meilleurs amis</div>
        <div className="text-white/60 text-sm">Personne n&apos;a encore posté…</div>
      </div>
    );
  }

  return (
    <div className="retro-box">
      <div className="neon-pink font-bold mb-2">Classement des meilleurs amis</div>
      <ol className="space-y-1">
        {top.map((f, i) => (
          <li key={f.pseudo} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-white truncate">
              {MEDALS[i] ?? `${i + 1}.`} @{f.pseudo}
            </span>
            <span className="text-white/70 whitespace-nowrap">
              {f.count} post{f.count > 1 ? "s" : ""}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
