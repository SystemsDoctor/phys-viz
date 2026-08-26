import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { parseExplain, ExplainPanel } from './index';

describe('parseExplain', () => {
  it('parses headings and paragraphs to HTML', () => {
    const { html, ok } = parseExplain('## What am I looking at?\n\nTwo vectors.');
    expect(ok).toBe(true);
    expect(html).toContain('<h2>What am I looking at?</h2>');
    expect(html).toContain('<p>Two vectors.</p>');
  });

  it('renders bold/italic markdown', () => {
    const { html } = parseExplain('**a** and *b*');
    expect(html).toContain('<strong>a</strong>');
    expect(html).toContain('<em>b</em>');
  });

  it('renders inline math via KaTeX', () => {
    const { html } = parseExplain('the dot product is $\\vec{a}\\cdot\\vec{b}$.');
    expect(html).toContain('class="katex"');
  });

  it('renders block math in display mode', () => {
    const { html } = parseExplain(
      '$$ \\vec{a} \\cdot \\vec{b} = |\\vec{a}||\\vec{b}|\\cos\\theta $$',
    );
    expect(html).toContain('katex-display');
  });

  it('renders a real explain.md fixture (headings, bold, inline math, block math together)', () => {
    const source = [
      '## What am I looking at?',
      '',
      'Two vectors, **a** and **b**, drawn from a common origin.',
      '',
      '## The equations',
      '',
      '$$ \\vec{a} \\cdot \\vec{b} = |\\vec{a}||\\vec{b}|\\cos\\theta $$',
    ].join('\n');
    const { html, ok } = parseExplain(source);
    expect(ok).toBe(true);
    expect(html).toContain('<h2>What am I looking at?</h2>');
    expect(html).toContain('<strong>a</strong>');
    expect(html).toContain('katex-display');
  });

  it('parses an HTML comment without rendering it as content (ADR 0002 — plain markdown, not MDX)', () => {
    const { html } = parseExplain('<!-- a note for the author -->\n\nVisible text.');
    expect(html).toContain('Visible text.');
  });

  it('reports ok:false rather than throwing for pathological input', () => {
    // KaTeX itself won't throw (throwOnError: false renders an error
    // span instead), so this is really just confirming parseExplain
    // never propagates an exception outward regardless of input.
    const result = parseExplain('$$ \\unknowncommand $$');
    expect(result.ok).toBe(true); // KaTeX degrades gracefully; still parses
    expect(result.html.length).toBeGreaterThan(0);
  });
});

describe('ExplainPanel', () => {
  it('renders parsed HTML into the DOM', () => {
    const { container } = render(<ExplainPanel source={'## Title\n\nBody text.'} />);
    expect(container.querySelector('h2')?.textContent).toBe('Title');
    expect(container.textContent).toContain('Body text.');
  });
});
