import DOMPurify, { type DOMPurify as DOMPurifyInstance } from "dompurify";
import { marked, type Tokens } from "marked";

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Disabling html and tag tokenizers prevents raw HTML from being parsed into DOM nodes.
marked.use({
  gfm: true,
  breaks: true,
  tokenizer: {
    html() {
      return undefined;
    },
    tag() {
      return undefined;
    },
  },
  renderer: {
    html({ text }: { text: string }) {
      return escapeHtml(text);
    },
    listitem(item: Tokens.ListItem) {
      const text = this.parser.parse(item.tokens);
      if (item.task) {
        return `<li class="task-list-item">${text}</li>\n`;
      }
      return `<li>${text}</li>\n`;
    },
  },
});

let purifyInstance: DOMPurifyInstance | null = null;
let hookRegistered = false;

function getPurify(): DOMPurifyInstance | null {
  if (purifyInstance) {
    return purifyInstance;
  }

  if (typeof DOMPurify?.sanitize === "function") {
    purifyInstance = DOMPurify;
  } else if (typeof DOMPurify === "function") {
    const win =
      typeof window !== "undefined"
        ? window
        : (globalThis as unknown as { window?: Window }).window;
    if (win) {
      purifyInstance = (DOMPurify as unknown as (w: unknown) => DOMPurifyInstance)(win);
    }
  }

  if (purifyInstance && !hookRegistered && typeof purifyInstance.addHook === "function") {
    purifyInstance.addHook("afterSanitizeAttributes", (node: Element) => {
      if (node.tagName === "A") {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    });

    purifyInstance.addHook("afterSanitizeElements", (node: Node) => {
      if (node.nodeType === 1) {
        const el = node as Element;
        const tag = el.tagName;
        if (["P", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "BLOCKQUOTE"].includes(tag)) {
          // If P is inside blockquote or li, let parent container resolve direction
          if (
            tag === "P" &&
            (el.parentElement?.tagName === "BLOCKQUOTE" || el.parentElement?.tagName === "LI")
          ) {
            return;
          }
          el.setAttribute("dir", "auto");
        }
      }
    });

    hookRegistered = true;
  }

  return purifyInstance;
}

export function renderMarkdown(source: string): string {
  if (!source?.trim()) {
    return "";
  }

  const compiledHtml = marked.parse(source) as string;
  const purify = getPurify();

  if (purify) {
    return purify.sanitize(compiledHtml, {
      ADD_ATTR: ["target", "rel"],
    });
  }

  // Return escaped source text if DOMPurify is unavailable
  return escapeHtml(source);
}
