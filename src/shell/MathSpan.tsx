/**
 * Shared KaTeX-rendered inline math span. Used anywhere a ParamDef/
 * ScalarDef's optional `symbol` (or explain.md's math, M3-26) needs
 * rendering — one place so every consumer stays consistent.
 */
import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export function MathSpan({
  latex,
  className,
}: {
  latex: string;
  className?: string;
}): React.ReactElement {
  const html = React.useMemo(() => katex.renderToString(latex, { throwOnError: false }), [latex]);
  // KaTeX's own sanitized output — same pattern as scene/annotate/htmlOverlay.ts.
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
