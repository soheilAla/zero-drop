import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
// @ts-expect-error jsdom Window matches DOMPurify expectations
globalThis.window = dom.window;
globalThis.document = dom.window.document;

const { escapeHtml, renderMarkdown } = await import("./markdown.ts");

test("treats arbitrary raw HTML as literal text instead of HTML elements", () => {
  const inputs = [
    '<script>alert("xss")</script>',
    '<img src="https://attacker.com/leak.jpg" onerror="alert(1)">',
    '<iframe src="https://evil.com"></iframe>',
    '<form action="https://evil.com"><input name="pw"><button>Submit</button></form>',
    '<svg onload="alert(1)"><circle r="5"/></svg>',
    '<custom-tag onfoo="bar">Content</custom-tag>',
    "<div><p>raw div block</p></div>",
  ];

  for (const input of inputs) {
    const output = renderMarkdown(input);

    assert.ok(
      output.includes("&lt;") && output.includes("&gt;"),
      `Expected output to contain escaped tags for input: ${input}`,
    );

    assert.ok(!output.includes("<script"));
    assert.ok(!output.includes("<img"));
    assert.ok(!output.includes("<iframe"));
    assert.ok(!output.includes("<form"));
    assert.ok(!output.includes("<svg"));
    assert.ok(!output.includes("<custom-tag"));
    assert.ok(!output.includes("<div>"));
  }
});

test("neutralizes dangerous URL schemes in Markdown links", () => {
  const dangerousLinks = [
    "[xss](javascript:alert(1))",
    "[vbscript](vbscript:alert(1))",
    "[data](data:text/html,<script>alert(1)</script>)",
  ];

  for (const link of dangerousLinks) {
    const output = renderMarkdown(link);
    assert.ok(!output.includes("javascript:"));
    assert.ok(!output.includes("vbscript:"));
    assert.ok(!output.includes("data:text/html"));
  }
});

test("preserves safe Markdown features (formatting, lists, code, safe links)", () => {
  const md = `# Title
**bold** and *italic* and ~~strike~~

- bullet 1
- bullet 2

1. numbered 1
2. numbered 2

> quote here

\`inline code\`

\`\`\`ts
const x: number = 42;
\`\`\`

[Safe link](https://example.com) and <https://example.com>`;

  const output = renderMarkdown(md);

  assert.ok(output.includes('<h1 dir="auto">Title</h1>'));
  assert.ok(output.includes("<strong>bold</strong>"));
  assert.ok(output.includes("<em>italic</em>"));
  assert.ok(output.includes("<del>strike</del>"));
  assert.ok(output.includes('<li dir="auto">bullet 1</li>'));
  assert.ok(output.includes('<li dir="auto">numbered 1</li>'));
  assert.ok(output.includes('<blockquote dir="auto">'));
  assert.ok(output.includes("<code>inline code</code>"));
  assert.ok(output.includes('<pre><code class="language-ts">'));
  assert.ok(output.includes('href="https://example.com"'));
  assert.ok(output.includes('target="_blank"'));
  assert.ok(output.includes('rel="noopener noreferrer"'));
});

test("escapeHtml escapes special characters properly", () => {
  const dangerous = "<script>alert(\"xss & 'danger'\")</script>";
  const escaped = escapeHtml(dangerous);
  assert.strictEqual(
    escaped,
    "&lt;script&gt;alert(&quot;xss &amp; &#039;danger&#039;&quot;)&lt;/script&gt;",
  );
});

test("handles empty and whitespace-only strings gracefully", () => {
  assert.strictEqual(renderMarkdown(""), "");
  assert.strictEqual(renderMarkdown("   \n\t  "), "");
});
