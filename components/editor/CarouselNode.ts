import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    carousel: {
      insertCarousel: (attrs: { urls: string[] }) => ReturnType;
    };
  }
}

/**
 * Retro carousel — a block node that groups several images.
 * Renders as <div data-carousel="true" class="retro-carousel"><img …><img …></div>
 * and is preserved through getHTML() → sanitizeHtml() → dangerouslySetInnerHTML.
 * Without a dedicated node, TipTap would drop the wrapper div and only the
 * last image would survive (or be split across paragraphs).
 */
export const CarouselNode = Node.create({
  name: "carousel",
  group: "block",
  content: "image*",
  isolating: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      "data-carousel": {
        default: "true",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-carousel") ?? "true",
        renderHTML: () => ({ "data-carousel": "true" }),
      },
      class: {
        default: "retro-carousel",
        parseHTML: () => "retro-carousel",
        renderHTML: () => ({ class: "retro-carousel" }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-carousel]",
      },
      {
        tag: "div.retro-carousel",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-carousel": "true", class: "retro-carousel" }),
      0,
    ];
  },

  addCommands() {
    return {
      insertCarousel:
        (attrs: { urls: string[] }) =>
        ({ chain }) => {
          const images = attrs.urls.map((url) => ({
            type: "image",
            attrs: { src: url, alt: "" },
          }));
          return chain()
            .insertContent({
              type: this.name,
              attrs: { "data-carousel": "true", class: "retro-carousel" },
              content: images,
            })
            .run();
        },
    };
  },
});
