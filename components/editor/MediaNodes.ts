import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Minimal TipTap nodes for <video> and <audio> so that
 * `editor.getHTML()` preserves them. Without these, StarterKit
 * drops unknown tags and voice notes / video embeds vanish on save.
 * They are block-level, atom (no editable children), draggable.
 */

export const VideoNode = Node.create({
  name: "video",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      autoplay: { default: null },
      muted: { default: null },
      loop: { default: null },
      poster: { default: null },
      width: { default: null },
      height: { default: null },
      style: { default: null },
      class: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "video" }];
  },

  renderHTML({ HTMLAttributes }) {
    // Ensure controls is always present for playback
    return ["video", mergeAttributes(HTMLAttributes, { controls: "true" })];
  },
});

export const AudioNode = Node.create({
  name: "audio",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      autoplay: { default: null },
      loop: { default: null },
      style: { default: null },
      class: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "audio" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["audio", mergeAttributes(HTMLAttributes, { controls: "true" })];
  },
});
