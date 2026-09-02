import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    rawHtml: {
      insertRawHtml: (html: string) => ReturnType;
    };
  }
}

export const RawHtml = Node.create({
  name: "rawHtml",
  group: "block",
  content: "inline*",
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      "data-tag": { default: null },
      "data-ohtml": { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "marquee",
        getAttrs: (el) => ({
          "data-tag": "marquee",
          "data-ohtml": btoa((el as HTMLElement).outerHTML),
        }),
      },
      {
        tag: "blink",
        getAttrs: (el) => ({
          "data-tag": "blink",
          "data-ohtml": btoa((el as HTMLElement).outerHTML),
        }),
      },
      {
        tag: "span",
        getAttrs: (el) => {
          if ((el as HTMLElement).className === "rainbow-text") {
            return {
              "data-tag": "span",
              "data-ohtml": btoa((el as HTMLElement).outerHTML),
            };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const tag = HTMLAttributes["data-tag"] ?? "div";
    return [tag, mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      insertRawHtml:
        (html: string) =>
        ({ commands }) => {
          const tag = html.match(/^<(\w+)/)?.[1] ?? "div";
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = html;
          const textContent = tempDiv.textContent ?? "";
          return commands.insertContent({
            type: this.name,
            attrs: {
              "data-tag": tag,
              "data-ohtml": btoa(html),
            },
            content: textContent
              ? [{ type: "text", text: textContent }]
              : [],
          });
        },
    };
  },
});
