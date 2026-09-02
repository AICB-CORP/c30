import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    rainbow: { toggleRainbow: () => ReturnType };
    marqueeMark: { toggleMarquee: () => ReturnType };
    blinkMark: { toggleBlink: () => ReturnType };
    blurMark: { toggleBlur: () => ReturnType };
  }
}

export const Rainbow = Mark.create({
  name: "rainbow",

  addAttributes() {
    return { class: { default: "rainbow-text" } };
  },

  parseHTML() {
    return [{ tag: 'span[class="rainbow-text"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      toggleRainbow:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },

  addKeyboardShortcuts() {
    return { "Mod-Shift-r": () => this.editor.commands.toggleRainbow() };
  },
});

export const Marquee = Mark.create({
  name: "marqueeMark",

  addAttributes() {
    return {};
  },

  parseHTML() {
    return [{ tag: "marquee" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["marquee", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      toggleMarquee:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },

  addKeyboardShortcuts() {
    return { "Mod-Shift-m": () => this.editor.commands.toggleMarquee() };
  },
});

export const Blink = Mark.create({
  name: "blinkMark",

  addAttributes() {
    return {};
  },

  parseHTML() {
    return [{ tag: "blink" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["blink", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      toggleBlink:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },

  addKeyboardShortcuts() {
    return { "Mod-Shift-b": () => this.editor.commands.toggleBlink() };
  },
});

export const Blur = Mark.create({
  name: "blurMark",

  addAttributes() {
    return { class: { default: "blur-text" } };
  },

  parseHTML() {
    return [{ tag: 'span[class="blur-text"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      toggleBlur:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },

  addKeyboardShortcuts() {
    return { "Mod-Shift-z": () => this.editor.commands.toggleBlur() };
  },
});
