import type { ReactNode } from "react";

// Note : on NE force pas de revalidate/statique ici. Le layout parent
// app/(site)/layout.tsx exporte `dynamic = "force-dynamic"` (il charge le
// profil connecté), et ce layout gagne sur toute directive d'enfants :
// la page est donc dynamique par héritage. Contenu 100% statique, donc rien
// à précharger — on laisse (site) diriger.

export const metadata = {
  title: "Aide & Explication — Skyblog des 30 ans",
  description:
    "Guide simple et chaleureux pour comprendre le site, l'éditeur, les effets rétro, les médias et la publication. Pour tout le monde, même sans être branché·e !",
  robots: { index: false, follow: false },
};

type Item = {
  icon: string;
  title: string;
  body: ReactNode;
  note?: string;
};

type Section = {
  icon: string;
  title: string;
  intro?: ReactNode;
  items?: Item[];
  note?: string;
};

const SECTIONS: Section[] = [
  {
    icon: "🌟",
    title: "1. Le blog, c'est quoi ?",
    intro: (
      <p>
        Un <strong className="neon-pink">Skyblog</strong>, c&rsquo;est une petite page personnelle
        sur Internet, comme il y en avait plein dans les années 2000. On y écrit des trucs, on met
        des photos, de la musique, des <em>gifs animés</em>, du texte arc-en-ciel qui clignote… et
        on partage ça avec ses proches.
      </p>
    ),
  },
  {
    icon: "🧭",
    title: "2. Le menu (en haut de l'écran)",
    intro: "On retrouve toujours les mêmes boutons en haut. Voici ce qu'ils font :",
    items: [
      {
        icon: "🏠",
        title: "Accueil",
        body: "la page d'arrivée : les derniers messages publiés, le compteur de visites, le classement des auteur·es, et les plus beaux messages.",
      },
      {
        icon: "💬",
        title: "Le Blab",
        body: "une « shoutbox » (com' la messagerie de l'époque). On y glisse un petit mot rapide que tout le monde voit défiler en direct.",
      },
      {
        icon: "👤",
        title: "Mon profil",
        body: "la page de quelqu'un : son pseudo, son humeur, ses messages et ses coups de cœur. Un mini-skyblog par personne.",
      },
      {
        icon: "⚙️",
        title: "Mon compte",
        body: "ici, tu changes ton pseudo, ton humeur (du type « nostalgique 💜 »), ta photo et ta petite biographie.",
      },
      {
        icon: "📖",
        title: "Explication",
        body: "la page que tu lis en ce moment !",
      },
      {
        icon: "✨",
        title: "Jour J",
        body: "une page réservée à la personne qui fête ses 30 ans. Si ce n'est pas toi, le bouton n'apparaît pas, c'est normal : c'est réservé 🎁.",
      },
    ],
    note: "Pas besoin d'apprendre l'anglais ou d'être expert en informatique : chaque bouton est clair, et ce guide reste toujours là si tu oublies quelque chose.",
  },
  {
    icon: "✏️",
    title: "3. Écrire un joli message (le post)",
    intro:
      "On appelle un message un post. Tu peux en écrire autant que tu veux. Quand tu veux en écrire un, une petite barre d'outils s'ouvre tout en haut, comme dans un traitement de texte.",
    items: [
      {
        icon: "B · I · U · S",
        title: "La police du texte",
        body: "mettre le texte en gras, en italique, en souligné ou en barré.",
      },
      {
        icon: "🔤",
        title: "Le style d'écriture",
        body: "choisir une police rétro : Comic Sans (la plus célèbre, lol), Dancing Script (cursive), Courier New (machine à écrire), Georgia (une police un peu élégante) et Arial (la plus sobre)…",
      },
      {
        icon: "Aa",
        title: "La taille",
        body: "agrandir ou rétrécir le texte (de petit à très gros).",
      },
      {
        icon: "🎨",
        title: "La couleur",
        body: "colorer le texte. Il y a une palette toutes prêtes (rose, violet, bleu, jaune fluo…) et un bouton « Choisir une couleur » pour n'importe quelle couleur.",
      },
      {
        icon: "↔️",
        title: "L'alignement",
        body: "ranger le texte à gauche, tout au milieu (centré) ou à droite.",
      },
      {
        icon: "▫️",
        title: "Les listes",
        body: "faire une liste à points ou une liste numérotée.",
      },
      {
        icon: "🔗",
        title: "Le lien",
        body: "coller une adresse Internet (par ex. un lien YouTube) qui devient cliquable.",
      },
      {
        icon: "H",
        title: "Le titre",
        body: "faire un gros titre au milieu de ton message pour bien le démarquer.",
      },
    ],
  },
  {
    icon: "🌈",
    title: "4. Les effets magiques de l'époque",
    intro: "Et surtout, voici les effets rigolos qu'on avait tous en 2006 :",
    items: [
      {
        icon: "🌈",
        title: "Arc-en-ciel",
        body: "le texte passe par toutes les couleurs tout seul, super beau.",
      },
      {
        icon: "⚡",
        title: "Néon",
        body: "le texte brille comme une affiche lumineuse (« néon »), avec un halo de couleur autour.",
      },
      {
        icon: "📜",
        title: "Défilant",
        body: "le texte (ou un mot) défile tout seul de droite à gauche, comme une bannière publicitaire.",
      },
      {
        icon: "💫",
        title: "Clignotant",
        body: "le texte clignote. Avoir un peu honte est le but : c'est le charme !",
      },
      {
        icon: "🔍",
        title: "Flou (effet)",
        body: "rendre un mot flou et mystérieux, comme un indice : il ne se voit bien qu'en passant la souris dessus (sur un écran tactile, en le touchant). C'est un petit jeu à deviner !",
      },
    ],
    note: "Tu peux enchaîner les effets : par exemple un texte rose qui est à la fois néon, en arc-en-ciel, qui défile et qui clignote. C'est super « année 2000 » et c'est pour ça qu'on l'aime.",
  },
  {
    icon: "🎞️",
    title: "5. Ajouter des photos, de la musique, un gif…",
    intro: "En dessous de la barre d'outils, il y a les outils « média » :",
    items: [
      {
        icon: "🖼️",
        title: "Photos",
        body: "ajouter une ou plusieurs photos depuis ton téléphone ou ton ordinateur. Une photo lourde ? Le site la compresse tout seul pour que ça ne prenne pas trop de place.",
      },
      {
        icon: "✂️",
        title: "Recadrer",
        body: "quand une photo arrive, on peut la recadrer (on choisit la taille : libre, carrée, 4:3 ou 16:9) et la faire pivoter, comme un petit photomaton 📷. Plusieurs photos à la suite ? On peut les enchaîner en carrousel, comme un diaporama qu'on fait avancer d'un coup de doigt.",
      },
      {
        icon: "🎵",
        title: "Musique (Spotify)",
        body: "coller le lien d'un morceau trouvé sur Spotify : un petit lecteur avec la pochette apparaît, exactement comme sur Instagram.",
      },
      {
        icon: "▶️",
        title: "Vidéo (YouTube)",
        body: "coller le lien d'une vidéo YouTube : une petite case vidéo s'affiche directement dans le post.",
      },
      {
        icon: "🎙️",
        title: "Voix",
        body: "enregistrer une parole directement dans ton navigateur : un bouton « 🔴 Enregistrer » démarre, tu parles et tu l'arrêtes (deux minutes maximum). Le son est ajouté comme un petit lecteur à barre, parfait pour dire un truc en direct, avec sa voix.",
      },
      {
        icon: "💬",
        title: "Gif animé",
        body: "choisir un gif animé : coeurs, étoiles, papillons, petites flammes, séparateurs scintillants… On prend un motif d'époque, ou on en cherche d'autres par un mot (par ex. « fête », « câlin »).",
      },
    ],
  },
  {
    icon: "⚙️",
    title: "6. Le mode HTML (pour les averti·es)",
    intro:
      "Au milieu de la barre d'outils, un gros bouton « HTML ». Ce bouton est pour celles et ceux qui connaissent un peu le code de l'époque : quand on l'appuie, la zone de texte devient une fenêtre noire (comme sur un vieux ordinateur) où l'on peut coller du code HTML.",
    items: [
      {
        icon: "📜",
        title: "Marquee",
        body: "texte qui défile de droite à gauche.",
      },
      {
        icon: "💫",
        title: "Blink",
        body: "texte qui clignote.",
      },
      {
        icon: "🌈",
        title: "Arc-en-ciel",
        body: "un mot qui change de couleur tout seul.",
      },
    ],
    note: "Le site vérifie bien tout ce qu'on colle pour que ça ne casse rien ni fasse de mal : les trucs inconnus sont simplement ignorés. Et si tu veux juste écrire un message normal, tu oublies ce bouton : tout marche très bien sans lui.",
  },
  {
    icon: "🔒",
    title: "7. Public ou Privé ?",
    intro: "En bas de ton message, tu choisis qui va le voir :",
    items: [
      {
        icon: "🌍",
        title: "Public",
        body: "tout le monde dans le blog peut le lire (c'est le réglage par défaut : on partage tout 😉).",
      },
      {
        icon: "🔒",
        title: "Privé",
        body: "une personne seulement peut le lire (par exemple, un mot personnel pour quelqu'un de spécial). Tu peux le changer à tout moment, même après avoir publié.",
      },
    ],
  },
  {
    icon: "💜",
    title: "8. Les coups de cœur",
    intro:
      "Sous chaque message, un petit bouton en forme de coeur. Quand on le clique, un nuage de petites images de coeurs éclate joyeusement à l'écran, et le message monte dans le classement des plus appréciés de l'accueil. C'est le petit geste qui a fait la folie d'Internet : montrer qu'on a aimé !",
  },
  {
    icon: "💬",
    title: "9. Le Blab (la shoutbox)",
    intro:
      "Dans le menu « Le Blab », une grande case : c'est le mur à messages rapides de tout le monde. On tape un petit mot, on appuie sur « Envoyer » et ça apparaît tout de suite, en direct, en bas de l'écran, avec la date et l'heure. L'effet WhatsApp des années 00 : on peut y laisser un conseil, un clin d'oeil…",
  },
  {
    icon: "🔢",
    title: "10. Le compteur de visites",
    intro:
      "En haut de l'accueil, un petit compteur qui fait « tic-tic » comme l'horodateur d'une vieille voiture : c'est le compteur de visites. Il augmente d'un à chaque personne qui passe par le blog. C'est une touche nostalgie d'époque : « tu es la visite #1 234 du blog ! »",
  },
  {
    icon: "💾",
    title: "11. Et pour publier ?",
    intro: "Tout en bas de la barre d'outils, deux gros boutons :",
    items: [
      {
        icon: "💾",
        title: "Publier",
        body: "le message apparaît dans le blog, tout de suite, pour celles et ceux qui ont le droit de le voir.",
      },
      {
        icon: "✕",
        title: "Annuler",
        body: "on revient en arrière, on n'envoie rien.",
      },
    ],
    note: "Astuce : pas envie que tout le monde voie ? Publie en « Privé » (section 7) : un mot restera juste entre toi et quelqu'un de spécial, et tu pourras le changer à tout moment, même plus tard.",
  },
];

export default function ExplicationPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-3 py-4 text-white sm:px-4">
      <div className="marquee">
        <span className="blink neon-pink">
          ★&nbsp;★&nbsp;★&nbsp;★&nbsp;★&nbsp;★&nbsp;B I E N &nbsp; V E N U
          E&nbsp;★&nbsp;★&nbsp;★&nbsp;★&nbsp;★&nbsp;★&nbsp;★★
        </span>
      </div>

      <header className="text-center">
        <h1 className="retro-title neon-pink text-2xl sm:text-3xl">📖 Le petit guide du Skyblog</h1>
        <p className="text-sm text-[#ffb6d9]">
          Bienvenue&nbsp;! Cette page explique, tout doux, comment on utilise le blog&nbsp;: ce que
          c&rsquo;est, comment on écrit, tous les effets rigolos de 2006 et comment publier. Prends
          ton temps&nbsp;: personne ne se moque&nbsp;😇
        </p>
      </header>

      {SECTIONS.map((s) => (
        <section key={s.title} className="retro-box">
          <h2 className="retro-title neon-pink mb-2 text-base sm:text-lg">
            <span aria-hidden>{s.icon}</span> {s.title}
          </h2>
          {s.intro && <div className="text-[#ffd0ea]">{s.intro}</div>}
          {s.items && (
            <ul className="space-y-2 text-[#ffd0ea]">
              {s.items.map((it) => (
                <li key={it.title} className="flex gap-2">
                  <span aria-hidden className="shrink-0">
                    {it.icon}
                  </span>
                  <span>
                    <strong className="neon-blue">{it.title}</strong>
                    {it.body}
                    {it.note && <p className="mt-1 text-xs text-[#ffb6d9]">↳ {it.note}</p>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {s.note && !s.items && <p className="text-xs text-[#ffb6d9]">↳ {s.note}</p>}
        </section>
      ))}

      <footer className="retro-box text-center">
        <p className="neon-pink">
          Prêt·e&nbsp;? Clique sur le bouton{" "}
          <strong className="neon-blue">« ✏️ Écrire un post »</strong>
          tout en bas à droite de l&rsquo;écran, et lâche-toi&nbsp;!
          <span className="blink"> 💗</span>
        </p>
        <p className="mt-2 text-xs text-[#ffb6d9]">
          Ce guide reste toujours accessible par le bouton 📖 Explication. Bon écrit à toi&nbsp;: on
          a hâte de lire ce que tu as à dire&nbsp;😙
        </p>
      </footer>
    </main>
  );
}
