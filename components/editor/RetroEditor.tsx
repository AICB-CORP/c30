"use client";

import { useState } from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, FontFamily, FontSize } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { createClient } from "@/lib/supabase/client";
import { sanitizeHtml } from "@/lib/sanitize";
import MediaUpload from "@/components/media/MediaUpload";
import GifPicker from "@/components/media/GifPicker";
import VoiceRecorder from "@/components/media/VoiceRecorder";
import type { PostWithRelations } from "@/lib/types";

const NEON_SHADOW = "0 0 8px #ff69b4, 0 0 16px #ff69b4";

const Neon = Extension.create({
  name: "neon",
  addOptions() {
    return { types: ["textStyle"] as string[] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textShadow: {
            default: null as string | null,
            parseHTML: (element: HTMLElement) => element.style.textShadow || null,
            renderHTML: (attributes: { textShadow?: string | null }) =>
              attributes.textShadow ? { style: `text-shadow: ${attributes.textShadow}` } : {},
          },
        },
      },
    ];
  },
});

const extensions = [
  StarterKit.configure({
    link: false,
    heading: { levels: [1, 2] },
  }),
  TextStyle,
  Color,
  FontFamily,
  FontSize,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Placeholder.configure({
    placeholder: "Raconte ta meilleure histoire avec elle… (2004 vibes)",
  }),
  Link.configure({ openOnClick: false }),
  Neon,
];

const FONTS = [
  { label: "Comic Sans MS", value: "Comic Sans MS" },
  { label: "Dancing Script", value: "var(--font-retro-cursive)" },
  { label: "Courier New", value: "Courier New" },
  { label: "Georgia", value: "Georgia" },
  { label: "Arial", value: "Arial" },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28];

const SWATCHES = ["#FF69B4", "#8B00FF", "#00BFFF", "#FFD700", "#00FF88", "#FFFFFF"];

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface RetroEditorProps {
  existing?: PostWithRelations | null;
  onDone?: () => void;
  onCancel?: () => void;
}

export default function RetroEditor({ existing, onDone, onCancel }: RetroEditorProps) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [isPrivate, setIsPrivate] = useState(existing?.is_private ?? false);
  const [musicEmbed, setMusicEmbed] = useState<string | null>(existing?.music_embed ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlText, setHtmlText] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const editor = useEditor({
    extensions,
    content: existing?.content ?? "",
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: "prose-retro",
      },
    },
  });

  if (!editor) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2">
        <div className="retro-box w-[95vw] max-w-3xl text-center">
          Chargement de l&apos;éditeur…
        </div>
      </div>
    );
  }

  function wrapSelection(openTag: string, closeTag: string, placeholder: string) {
    const { selection } = editor.state;
    const text = selection.empty
      ? placeholder
      : escapeHtml(editor.state.doc.textBetween(selection.from, selection.to, " "));
    editor.chain().focus().deleteSelection().insertContent(`${openTag}${text}${closeTag}`).run();
  }

  async function handleOEmbed(url: string): Promise<{ html?: string } | null> {
    const res = await fetch("/api/oembed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return null;
    return res.json();
  }

  async function handleAddMusic() {
    const url = window.prompt("Colle le lien (Spotify…) :");
    if (!url) return;
    setError(null);
    try {
      const data = await handleOEmbed(url.trim());
      if (data?.html) {
        setMusicEmbed(data.html);
      } else {
        setError("Aucun aperçu trouvé pour ce lien.");
      }
    } catch {
      setError("Impossible de récupérer la musique.");
    }
  }

  async function handleAddVideo() {
    const url = window.prompt("Colle le lien YouTube :");
    if (!url) return;
    setError(null);
    try {
      const data = await handleOEmbed(url.trim());
      if (data?.html) {
        editor.chain().focus().insertContent(data.html).run();
      } else {
        setError("Aucun aperçu vidéo trouvé pour ce lien.");
      }
    } catch {
      setError("Impossible de récupérer la vidéo.");
    }
  }

  function handleLink() {
    const url = window.prompt("URL du lien :");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url.trim() }).run();
    }
  }

  async function handleVoiceRecorded(blob: Blob) {
    setError(null);
    try {
      const contentType = blob.type || "audio/webm";
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: "post-media", contentType }),
      });
      if (!res.ok) throw new Error("upload");
      const { signedUrl, publicUrl } = await res.json();
      await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob,
      });
      editor.chain().focus().insertContent(`<audio controls src="${publicUrl}"></audio>`).run();
      setShowVoiceRecorder(false);
    } catch {
      setError("Impossible d'enregistrer ta voix.");
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Session expirée, reconnecte-toi !");
        setSaving(false);
        return;
      }

      const html = sanitizeHtml(editor.getHTML());
      const payload = {
        title: title.trim() || null,
        content: html,
        is_private: isPrivate,
        music_embed: musicEmbed,
      };

      const { error: saveError } = existing
        ? await supabase.from("posts").update(payload).eq("id", existing.id)
        : await supabase.from("posts").insert({ ...payload, author_id: user.id });

      if (saveError) {
        setError(`Erreur lors de l'enregistrement : ${saveError.message}`);
        setSaving(false);
        return;
      }
      onDone?.();
    } catch {
      setError("Erreur inattendue lors de l'enregistrement.");
      setSaving(false);
    }
  }

  function toggleHtmlMode() {
    if (!htmlMode) {
      setHtmlText(editor.getHTML());
      setHtmlMode(true);
    } else {
      editor.commands.setContent(htmlText);
      setHtmlMode(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-2 py-6 md:items-center">
      <div className="retro-box w-[95vw] max-w-3xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="neon-pink retro-title text-2xl">
            {existing ? "✏️ Modifier le post" : "✏️ Nouveau post"}
          </h3>
          <button type="button" className="text-sm opacity-70 hover:opacity-100" onClick={onCancel}>
            ✖ Fermer
          </button>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre de ton post…"
          className="mb-3 w-full rounded-lg border-2 border-[#ff69b4] bg-black/60 px-3 py-2 text-white outline-none placeholder:text-white/40"
        />

        <div className="mb-3 flex gap-2">
          <button
            type="button"
            className={`retro-btn tool-btn${!isPrivate ? " active" : ""}`}
            onClick={() => setIsPrivate(false)}
          >
            🌍 Public
          </button>
          <button
            type="button"
            className={`retro-btn tool-btn${isPrivate ? " active" : ""}`}
            onClick={() => setIsPrivate(true)}
          >
            🔒 Privé
          </button>
          <span className="ml-auto self-center text-xs opacity-70">
            Privé = visible seulement par la destinataire
          </span>
        </div>

        <div className="mb-2 rounded-lg border-2 border-[#ff69b4]/60 bg-black/40 p-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="retro-btn tool-btn font-bold"
              title="Gras"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              B
            </button>
            <button
              type="button"
              className="retro-btn tool-btn italic"
              title="Italique"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              I
            </button>
            <button
              type="button"
              className="retro-btn tool-btn underline"
              title="Souligné"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              U
            </button>
            <button
              type="button"
              className="retro-btn tool-btn line-through"
              title="Barré"
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              S
            </button>
            <button
              type="button"
              className="retro-btn tool-btn"
              title="Titre 1"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              H1
            </button>
            <button
              type="button"
              className="retro-btn tool-btn"
              title="Titre 2"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              H2
            </button>
            <button
              type="button"
              className="retro-btn tool-btn"
              title="Liste"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              • Liste
            </button>
            <button
              type="button"
              className="retro-btn tool-btn"
              title="Liste numérotée"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              1. Liste
            </button>
            <span className="mx-1 h-6 w-px bg-[#ff69b4]/50" />
            <input
              type="color"
              title="Couleur du texte"
              value={editor.getAttributes("textStyle").color ?? "#FF69B4"}
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
              className="h-7 w-9 cursor-pointer border-2 border-[#ffb6d9] bg-transparent p-0"
            />
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                className="h-5 w-5 rounded-full border border-white/50"
                style={{ backgroundColor: c }}
                onClick={() => editor.chain().focus().setColor(c).run()}
              />
            ))}
            <select
              title="Police"
              className="retro-btn tool-btn"
              value={editor.getAttributes("textStyle").fontFamily ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v) editor.chain().focus().setFontFamily(v).run();
                else editor.chain().focus().unsetFontFamily().run();
              }}
            >
              <option value="">Police</option>
              {FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <select
              title="Taille du texte"
              className="retro-btn tool-btn"
              value={editor.getAttributes("textStyle").fontSize ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v) editor.chain().focus().setFontSize(`${v}px`).run();
                else editor.chain().focus().unsetFontSize().run();
              }}
            >
              <option value="">Taille</option>
              {FONT_SIZES.map((s) => (
                <option key={s} value={String(s)}>
                  {s}px
                </option>
              ))}
            </select>
            <span className="mx-1 h-6 w-px bg-[#ff69b4]/50" />
            <button
              type="button"
              className="retro-btn tool-btn"
              title="Aligné à gauche"
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              ⬅
            </button>
            <button
              type="button"
              className="retro-btn tool-btn"
              title="Centré"
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            >
              ⬌
            </button>
            <button
              type="button"
              className="retro-btn tool-btn"
              title="Aligné à droite"
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              ➡
            </button>
            <span className="mx-1 h-6 w-px bg-[#ff69b4]/50" />
            <button type="button" className="retro-btn tool-btn" title="Lien" onClick={handleLink}>
              🔗
            </button>
            <button
              type="button"
              className="retro-btn tool-btn"
              title="Musique (Spotify…)"
              onClick={handleAddMusic}
            >
              🎵
            </button>
            <button
              type="button"
              className="retro-btn tool-btn"
              title="Vidéo YouTube"
              onClick={handleAddVideo}
            >
              ▶️
            </button>
            <span className="mx-1 h-6 w-px bg-[#ff69b4]/50" />
            <button
              type="button"
              className="retro-btn tool-btn"
              title="Néon rose"
              onClick={() =>
                editor.chain().focus().setMark("textStyle", { textShadow: NEON_SHADOW }).run()
              }
            >
              ⚡ Néon
            </button>
            <button
              type="button"
              className="retro-btn tool-btn"
              title="Arc-en-ciel"
              onClick={() =>
                wrapSelection('<span class="rainbow-text">', "</span>", "texte arc-en-ciel")
              }
            >
              ✨
            </button>
            <button
              type="button"
              className="retro-btn tool-btn"
              title="Marquee défilant"
              onClick={() => wrapSelection("<marquee>", "</marquee>", "texte défilant")}
            >
              📜
            </button>
            <button
              type="button"
              className="retro-btn tool-btn"
              title="Clignotant"
              onClick={() => wrapSelection("<blink>", "</blink>", "texte clignotant")}
            >
              💫
            </button>
            <button
              type="button"
              className="retro-btn tool-btn"
              title="Mode HTML"
              onClick={toggleHtmlMode}
            >
              ⚙️ HTML
            </button>
          </div>
        </div>

        <div className="mb-2 flex flex-wrap gap-1.5">
          <MediaUpload
            kind="image"
            onUploaded={(_path, url) =>
              editor.chain().focus().insertContent(`<img src="${url}">`).run()
            }
          />
          <MediaUpload
            kind="video"
            onUploaded={(_path, url) =>
              editor.chain().focus().insertContent(`<video controls src="${url}"></video>`).run()
            }
          />
          <MediaUpload
            kind="audio"
            onUploaded={(_path, url) =>
              editor.chain().focus().insertContent(`<audio controls src="${url}"></audio>`).run()
            }
          />
          <button
            type="button"
            className="retro-btn tool-btn"
            onClick={() => setShowGifPicker(true)}
          >
            💬 GIF
          </button>
          <button
            type="button"
            className="retro-btn tool-btn"
            onClick={() => setShowVoiceRecorder(true)}
          >
            🎙 Voix
          </button>
        </div>

        {showGifPicker ? (
          <GifPicker
            onSelect={(src) => {
              editor.chain().focus().insertContent(`<img src="${src}">`).run();
              setShowGifPicker(false);
            }}
            onClose={() => setShowGifPicker(false)}
          />
        ) : null}

        {showVoiceRecorder ? <VoiceRecorder onRecorded={handleVoiceRecorded} /> : null}

        {musicEmbed ? (
          <div className="mb-2 rounded-lg border-2 border-dashed border-[#ff69b4] p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs">🎵 Musique du post</span>
              <button
                type="button"
                className="text-xs underline"
                onClick={() => setMusicEmbed(null)}
              >
                Retirer
              </button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: musicEmbed }} />
          </div>
        ) : null}

        {htmlMode ? (
          <div className="mb-2">
            <textarea
              value={htmlText}
              onChange={(e) => setHtmlText(e.target.value)}
              className="h-64 w-full rounded-lg border-2 border-[#ff69b4] bg-black p-2 font-mono text-xs text-white outline-none"
              spellCheck={false}
            />
            <div className="mt-2 flex gap-2">
              <button type="button" className="retro-btn tool-btn" onClick={toggleHtmlMode}>
                ✔ Appliquer le HTML
              </button>
              <button
                type="button"
                className="retro-btn tool-btn"
                onClick={() => {
                  setHtmlMode(false);
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="editor-area mb-2">
            <EditorContent editor={editor} />
          </div>
        )}

        {error ? (
          <p className="mb-2 rounded-lg border-2 border-red-400 bg-red-900/50 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <button type="button" className="retro-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement…" : existing ? "💾 Enregistrer" : "💾 Publier"}
          </button>
          <button type="button" className="retro-btn" onClick={onCancel} disabled={saving}>
            Annuler
          </button>
        </div>
      </div>

      <style>{`
        .retro-btn.tool-btn {
          padding: 0.25rem 0.6rem;
          font-size: 0.8rem;
        }
        .retro-btn.tool-btn.active {
          box-shadow: 0 0 0 2px #fff inset, 0 0 10px rgba(255, 20, 147, 0.5);
        }
        .editor-area .tiptap {
          min-height: 180px;
          padding: 0.75rem;
          outline: none;
        }
        .editor-area .tiptap p {
          margin: 0.25rem 0;
        }
        .editor-area .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: rgba(255, 255, 255, 0.4);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .editor-area .tiptap img {
          max-width: 100%;
          border-radius: 8px;
        }
        .editor-area .tiptap video,
        .editor-area .tiptap audio {
          max-width: 100%;
          border-radius: 8px;
        }
        .editor-area .tiptap h1 {
          font-size: 1.6em;
          font-weight: bold;
          margin: 0.4em 0;
        }
        .editor-area .tiptap h2 {
          font-size: 1.3em;
          font-weight: bold;
          margin: 0.4em 0;
        }
        .editor-area .tiptap ul {
          list-style: disc;
          padding-left: 1.4em;
        }
        .editor-area .tiptap ol {
          list-style: decimal;
          padding-left: 1.4em;
        }
        .editor-area .tiptap a {
          color: #00bfff;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
