import DOMPurify, { type DOMPurify as DOMPurifyInstance } from "dompurify";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
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
      if (
        node.nodeType === 1 &&
        ["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BLOCKQUOTE"].includes(
          (node as Element).tagName,
        )
      ) {
        (node as Element).setAttribute("dir", "auto");
      }
    });

    hookRegistered = true;
  }

  return purifyInstance;
}

// Supports headings, bold, italic, lists, links, blockquotes, inline code, fenced code blocks.
// Disables unsafe raw HTML and attributes to prevent XSS.
export function renderMarkdown(source: string): string {
  if (!source?.trim()) {
    return "";
  }

  const rawHtml = marked.parse(source) as string;
  const purify = getPurify();

  if (purify) {
    return purify.sanitize(rawHtml, {
      ADD_ATTR: ["target", "rel"],
    });
  }

  return rawHtml;
}
