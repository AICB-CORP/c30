"use client";

import { useState } from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import { TextSelection } from "prosemirror-state";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Rainbow, Marquee, Blink, Blur } from "@/components/editor/retroMarks";
import { TextStyle, Color, FontFamily, FontSize } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { VideoNode, AudioNode } from "@/components/editor/MediaNodes";
import { CarouselNode } from "@/components/editor/CarouselNode";
import { createClient } from "@/lib/supabase/client";
import { isSafeIframe, sanitizeHtml } from "@/lib/sanitize";
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
  Image,
  VideoNode,
  AudioNode,
  CarouselNode,
  Rainbow,
  Marquee,
  Blink,
  Blur,
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
  const [useCarousel, setUseCarousel] = useState(true);
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
  const mediaBusy = Object.values(busyMap).some(Boolean);
  const handleBusy =
    (id: string) =>
    (busy: boolean): void => {
      setBusyMap((prev) => ({ ...prev, [id]: busy }));
    };

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
      : editor.state.doc.textBetween(selection.from, selection.to, " ");
    const html = `${openTag}${escapeHtml(text)}${closeTag}`;
    editor.chain().focus().deleteSelection().insertContent(html).run();
  }

  function toggleRetroMark(
    markName: "toggleRainbow" | "toggleMarquee" | "toggleBlink" | "toggleBlur",
  ) {
    const { selection } = editor.state;
    if (selection.empty) {
      const placeholder = placeholderFor(markName);
      editor
        .chain()
        .focus()
        .insertContent(placeholder)
        .command(({ tr }) => {
          const pos = tr.selection.$from.pos;
          tr.setSelection(
            new TextSelection(tr.doc.resolve(pos - placeholder.length), tr.doc.resolve(pos)),
          );
          return true;
        })
        [markName]()
        .run();
    } else {
      editor.chain().focus()[markName]().run();
    }
  }

  function placeholderFor(cmd: string): string {
    if (cmd === "toggleRainbow") return "texte arc-en-ciel";
    if (cmd === "toggleMarquee") return "texte défilant";
    if (cmd === "toggleBlur") return "texte caché";
    return "texte clignotant";
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
    handleBusy("voice")(true);
    try {
      const rawType = blob.type || "audio/webm";
      const normalizedType = rawType.split(";")[0].trim().toLowerCase() || "audio/webm";
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: "post-media",
          contentType: normalizedType,
        }),
      });
      if (!res.ok) throw new Error("upload");
      const { signedUrl, publicUrl } = await res.json();
      await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": normalizedType },
        body: blob,
      });
      editor.chain().focus().insertContent(`<audio controls src="${publicUrl}"></audio>`).run();
      setShowVoiceRecorder(false);
    } catch {
      setError("Impossible d'enregistrer ta voix.");
    } finally {
      handleBusy("voice")(false);
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

      const rawHtml = editor.getHTML();
      const restored = rawHtml.replace(
        /<(\w+)\s[^>]*?data-ohtml="([^"]*)"[^>]*?>[\s\S]*?<\/\1>/gi,
        (_m, _tag, b64) => {
          try {
            return atob(b64);
          } catch {
            return "";
          }
        },
      );
      const html = sanitizeHtml(restored);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/80 p-2">
      <div className="retro-box flex w-[95vw] max-w-3xl max-h-[90vh] flex-col overflow-hidden">
        {/* Header — always visible */}
        <div className="flex-shrink-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="neon-pink retro-title text-2xl">
              {existing ? "✏️ Modifier le post" : "✏️ Nouveau post"}
            </h3>
            <button
              type="button"
              className="text-sm opacity-70 hover:opacity-100"
              onClick={onCancel}
            >
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
        </div>

        {/* Scrollable middle — toolbar + media + editor; toolbar sticky, editor scrolls */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pr-1">
          <div className="sticky top-0 z-10 rounded-lg border-2 border-[#ff69b4]/60 bg-black/40 p-2 backdrop-blur-sm">
            <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x pb-1 scrollbar-thin">
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
              {(
                [
                  ["left", "⬅", "Aligné à gauche"],
                  ["center", "⬌", "Centré"],
                  ["right", "➡", "Aligné à droite"],
                ] as const
              ).map(([align, icon, label]) => {
                const currentAlign = editor.isActive("heading")
                  ? (editor.getAttributes("heading").textAlign ?? "left")
                  : (editor.getAttributes("paragraph").textAlign ?? "left");
                return (
                  <button
                    key={align}
                    type="button"
                    className={`retro-btn tool-btn${currentAlign === align ? " pushed" : ""}`}
                    title={label}
                    onClick={() => editor.chain().focus().setTextAlign(align).run()}
                  >
                    {icon}
                  </button>
                );
              })}
              <span className="mx-1 h-6 w-px bg-[#ff69b4]/50" />
              <button
                type="button"
                className="retro-btn tool-btn"
                title="Lien"
                onClick={handleLink}
              >
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
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  className={`retro-btn tool-btn${editor.getAttributes("textStyle").textShadow === NEON_SHADOW ? " pushed" : ""}`}
                  title="Néon — donne un effet lumineux néon rose au texte"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const current = editor.getAttributes("textStyle").textShadow;
                    if (current === NEON_SHADOW) {
                      editor.chain().focus().setMark("textStyle", { textShadow: null }).run();
                    } else {
                      editor
                        .chain()
                        .focus()
                        .setMark("textStyle", { textShadow: NEON_SHADOW })
                        .run();
                    }
                  }}
                >
                  ⚡ Néon
                </button>
                <button
                  type="button"
                  className={`retro-btn tool-btn${editor.isActive("rainbow") ? " pushed" : ""}`}
                  title="Arc-en-ciel — le texte défile dans toutes les couleurs"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleRetroMark("toggleRainbow")}
                >
                  ✨ Arc-en-ciel
                </button>
                <button
                  type="button"
                  className={`retro-btn tool-btn${editor.isActive("marqueeMark") ? " pushed" : ""}`}
                  title="Défilant — le texte défile de droite à gauche"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleRetroMark("toggleMarquee")}
                >
                  📜 Défilant
                </button>
                <button
                  type="button"
                  className={`retro-btn tool-btn${editor.isActive("blinkMark") ? " pushed" : ""}`}
                  title="Clignotant — le texte clignote comme un vieux site web"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleRetroMark("toggleBlink")}
                >
                  💫 Clignotant
                </button>
                <button
                  type="button"
                  className={`retro-btn tool-btn${editor.isActive("blurMark") ? " pushed" : ""}`}
                  title="Flou — le texte est caché, survole pour révéler le message secret"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleRetroMark("toggleBlur")}
                >
                  🔍 Flou
                </button>
              </div>
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
            <div className="flex items-center gap-1.5">
              <MediaUpload
                kind="image"
                multiple
                maxFiles={10}
                onUploaded={(_path, url) =>
                  editor.chain().focus().insertContent(`<img src="${url}">`).run()
                }
                onBatchUploaded={(uploads) => {
                  if (uploads.length === 0) return;
                  if (useCarousel && uploads.length > 1) {
                    const imgs = uploads.map((u) => `<img src="${u.url}" alt="">`).join("");
                    const html = `<div class="retro-carousel" data-carousel="true">${imgs}</div>`;
                    editor.chain().focus().insertContent(html).run();
                  } else {
                    const html = uploads.map((u) => `<img src="${u.url}" alt="">`).join("");
                    editor.chain().focus().insertContent(html).run();
                  }
                }}
                onBusyChange={handleBusy("image")}
              />
              <label
                className="flex items-center gap-1 text-xs opacity-80"
                title="Groupe les photos en carrousel quand tu en sélectionnes plusieurs"
              >
                <input
                  type="checkbox"
                  checked={useCarousel}
                  onChange={(e) => setUseCarousel(e.target.checked)}
                  className="h-3 w-3 accent-[#ff69b4]"
                />
                Carrousel
              </label>
            </div>
            <MediaUpload
              kind="video"
              onUploaded={(_path, url) =>
                editor.chain().focus().insertContent(`<video controls src="${url}"></video>`).run()
              }
              onBusyChange={handleBusy("video")}
            />
            <MediaUpload
              kind="audio"
              onUploaded={(_path, url) =>
                editor.chain().focus().insertContent(`<audio controls src="${url}"></audio>`).run()
              }
              onBusyChange={handleBusy("audio")}
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

          {musicEmbed && isSafeIframe(musicEmbed) ? (
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
            <div className="mb-2 flex min-h-0 flex-col overflow-hidden">
              <textarea
                value={htmlText}
                onChange={(e) => setHtmlText(e.target.value)}
                className="h-64 max-h-[45vh] w-full overflow-y-auto rounded-lg border-2 border-[#ff69b4] bg-black p-2 font-mono text-xs text-white outline-none md:max-h-[50vh]"
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
            <div className="editor-area mb-2 flex min-h-[180px] flex-col overflow-hidden rounded-lg border-2 border-[#ff69b4]/30 bg-black/20">
              <div className="min-h-[180px] flex-1 overflow-y-auto overflow-x-hidden p-2">
                <EditorContent editor={editor} />
              </div>
            </div>
          )}

          {mediaBusy ? (
            <p className="mb-2 rounded-lg border-2 border-[#ff69b4] bg-black/60 px-3 py-2 text-xs text-[#ffb6d9]">
              ⏳ Envoi en cours… attends la fin avant de publier
            </p>
          ) : null}

          {error ? (
            <p className="mb-2 rounded-lg border-2 border-red-400 bg-red-900/50 px-3 py-2 text-sm text-red-100">
              {error}
            </p>
          ) : null}
        </div>

        {/* Footer — always visible */}
        <div className="flex flex-shrink-0 gap-2 border-t border-[#ff69b4]/20 pt-3">
          <button
            type="button"
            className="retro-btn"
            onClick={handleSave}
            disabled={saving || mediaBusy}
            title={mediaBusy ? "Upload en cours…" : undefined}
          >
            {saving
              ? "Enregistrement…"
              : mediaBusy
                ? "⏳ Envoi…"
                : existing
                  ? "💾 Enregistrer"
                  : "💾 Publier"}
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
          border: 3px outset #ffb6d9;
          box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4), 0 0 8px rgba(255, 20, 147, 0.3);
          transition: all 0.08s ease;
          white-space: nowrap;
        }
        .retro-btn.tool-btn:active {
          border-style: inset;
          box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.4);
          transform: translateY(1px);
        }
        .retro-btn.tool-btn.pushed {
          border-style: inset;
          box-shadow: inset 2px 2px 6px rgba(0, 0, 0, 0.5), inset 0 0 12px rgba(255, 20, 147, 0.4);
          transform: translateY(1px);
          background: linear-gradient(180deg, #a0005e, #cc006a);
        }
        .editor-area .tiptap .blur-text {
          filter: blur(6px);
          transition: filter 0.3s ease;
          cursor: pointer;
        }
        .editor-area .tiptap .blur-text:hover {
          filter: blur(0);
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
        .editor-area .tiptap .retro-carousel {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          gap: 0.75rem;
          padding: 0.75rem;
          margin: 0.75rem 0;
          border: 3px ridge #ff69b4;
          border-radius: 12px;
          background: linear-gradient(180deg, #1a001a 0%, #0d0011 100%);
          max-width: 100%;
          box-sizing: border-box;
        }
        .editor-area .tiptap .retro-carousel img {
          flex: 0 0 auto;
          width: min(280px, 70vw);
          height: clamp(140px, 38vw, 200px);
          object-fit: cover;
          scroll-snap-align: start;
          border: 2px solid #ff69b4;
          border-radius: 8px;
        }
        @media (max-width: 640px) {
          .editor-area .tiptap .retro-carousel {
            gap: 0.5rem;
            padding: 0.5rem;
          }
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
