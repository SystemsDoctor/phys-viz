/**
 * Gallery route — lists every module from `manifests` (modules/registry),
 * with search/filter by category and level. Card data comes entirely
 * from ModuleManifest; no per-module code here. See ARCHITECTURE.md §9,
 * §11 ("initial page load cost is O(1) in the number of modules") — this
 * route only ever touches the eagerly-loaded manifests, never
 * `loadModule`.
 */
import React from 'react';
import { Link } from 'wouter';
import { manifests } from '@/modules/registry';
import type { Category } from '@/modules/types';

export function Gallery(): React.ReactElement {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<Category | 'all'>('all');

  const categories = React.useMemo(
    () => Array.from(new Set(manifests.map((m) => m.category))).sort(),
    [],
  );

  const filtered = manifests.filter((m) => {
    if (category !== 'all' && m.category !== category) return false;
    if (!query) return true;
    const haystack = `${m.title} ${m.blurb} ${m.tags.join(' ')}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <div className="pv-gallery">
      <h1>PhysViz</h1>
      <div className="pv-gallery__filters">
        <input
          type="search"
          placeholder="Search modules…"
          aria-label="Search modules"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | 'all')}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="pv-gallery__grid">
        {filtered.map((m) => (
          <Link key={m.id} to={`/m/${m.id}`} className="pv-gallery__card">
            <h2>{m.title}</h2>
            <p>{m.blurb}</p>
            <div className="pv-gallery__tags">
              <span className="pv-gallery__category">{m.category}</span>
              {m.tags.map((t) => (
                <span key={t} className="pv-gallery__tag">
                  {t}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && <p className="pv-gallery__empty">No modules match.</p>}
    </div>
  );
}
