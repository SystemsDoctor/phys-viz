import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'wouter';
import { Gallery } from './Gallery';
import { manifests } from '@/modules/registry';

function renderGallery(): ReturnType<typeof render> {
  return render(
    <Router hook={() => ['/', () => {}]}>
      <Gallery />
    </Router>,
  );
}

describe('Gallery', () => {
  it('renders a card for every registered module, sourced only from manifests', () => {
    renderGallery();
    for (const m of manifests) expect(screen.getByText(m.title)).toBeInTheDocument();
  });

  it('filters cards by search text against title/blurb/tags', async () => {
    renderGallery();
    const search = screen.getByLabelText('Search modules');
    await userEvent.type(search, 'zzz-no-such-module-zzz');
    for (const m of manifests) expect(screen.queryByText(m.title)).not.toBeInTheDocument();
    expect(screen.getByText('No modules match.')).toBeInTheDocument();
  });

  it('filters cards by category', async () => {
    renderGallery();
    const category = manifests[0]?.category;
    if (!category) return; // no modules registered — nothing to assert
    const select = screen.getByLabelText('Filter by category');
    await userEvent.selectOptions(select, category);
    for (const m of manifests) {
      const card = screen.queryByText(m.title);
      if (m.category === category) expect(card).toBeInTheDocument();
      else expect(card).not.toBeInTheDocument();
    }
  });

  it('every card links to /m/<id>', () => {
    renderGallery();
    for (const m of manifests) {
      const link = screen.getByText(m.title).closest('a');
      expect(link).toHaveAttribute('href', `/m/${m.id}`);
    }
  });
});
