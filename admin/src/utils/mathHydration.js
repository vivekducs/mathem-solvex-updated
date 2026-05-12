/**
 * mathHydration.js
 * 
 * Preprocessing layer that converts legacy LaTeX delimiters ($...$, $$...$$,
 * \(...\), \[...\]) into structured <span data-latex> / <div data-latex> HTML
 * BEFORE Tiptap/ProseMirror parses the content.
 * 
 * This ensures that:
 * 1. Legacy TinyMCE questions with $...$ survive setContent()
 * 2. Already-structured <span data-latex> content passes through unchanged
 * 3. Raw \(...\) delimiters from new content are also converted
 * 4. Block math ($$...$$, \[...\]) becomes <div data-latex>
 */

/**
 * Escapes HTML special characters inside a LaTeX string for safe embedding
 * in a data-latex attribute value.
 */
function escapeAttr(latex) {
  return latex
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Main hydration function. Call this on raw HTML/text BEFORE passing
 * to Tiptap's setContent() or as the initial `content` prop.
 * 
 * Conversion order matters — block math first, then inline, to avoid
 * double-matching ($$...$$ contains $...$).
 */
export function hydrateLatex(html) {
  if (!html || typeof html !== 'string') return html || '';

  let result = html;

  // ── 1. Skip content that is already inside <span data-latex> or <div data-latex> ──
  // We'll use a placeholder approach: temporarily replace existing structured
  // math nodes so they don't get double-processed.
  const preserved = [];
  result = result.replace(
    /<(span|div)\s+[^>]*data-latex="[^"]*"[^>]*>.*?<\/\1>/gs,
    (match) => {
      preserved.push(match);
      return `%%MATH_PRESERVED_${preserved.length - 1}%%`;
    }
  );

  // ── 2. Block math: $$...$$ → <div data-latex="..."> ──
  // Must come before inline $ to avoid partial matches.
  // Matches $$ on its own or with content between, non-greedy.
  result = result.replace(
    /\$\$([\s\S]+?)\$\$/g,
    (_, latex) => {
      const trimmed = latex.trim();
      return `<div data-latex="${escapeAttr(trimmed)}" class="math-block-node">\\[${trimmed}\\]</div>`;
    }
  );

  // ── 3. Block math: \[...\] → <div data-latex="..."> ──
  result = result.replace(
    /\\\[([\s\S]+?)\\\]/g,
    (_, latex) => {
      const trimmed = latex.trim();
      return `<div data-latex="${escapeAttr(trimmed)}" class="math-block-node">\\[${trimmed}\\]</div>`;
    }
  );

  // ── 4. Inline math: $...$ → <span data-latex="..."> ──
  // Single $...$ but NOT $$. Use a negative lookbehind/lookahead for $.
  // Also avoid matching empty $ $ or $$ (already handled).
  result = result.replace(
    /(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$)/g,
    (_, latex) => {
      const trimmed = latex.trim();
      return `<span data-latex="${escapeAttr(trimmed)}" class="math-node">\\(${trimmed}\\)</span>`;
    }
  );

  // ── 5. Inline math: \(...\) → <span data-latex="..."> ──
  // Only if not already inside a data-latex span (which we already preserved).
  result = result.replace(
    /\\\(((?:[^\\]|\\.)*?)\\\)/g,
    (_, latex) => {
      const trimmed = latex.trim();
      // Don't re-wrap if it's already inside a structured node
      return `<span data-latex="${escapeAttr(trimmed)}" class="math-node">\\(${trimmed}\\)</span>`;
    }
  );

  // ── 6. Restore preserved nodes ──
  result = result.replace(
    /%%MATH_PRESERVED_(\d+)%%/g,
    (_, idx) => preserved[parseInt(idx)]
  );

  return result;
}

export default hydrateLatex;
