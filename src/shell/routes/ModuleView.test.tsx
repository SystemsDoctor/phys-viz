import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Router } from 'wouter';
import { ModuleView } from './ModuleView';

const { loadModuleMock } = vi.hoisted(() => ({ loadModuleMock: vi.fn() }));
vi.mock('@/modules/registry', () => ({ loadModule: loadModuleMock }));

function renderModuleView(moduleId: string): ReturnType<typeof render> {
  return render(
    <Router hook={() => [`/m/${moduleId}`, () => {}]}>
      <ModuleView moduleId={moduleId} />
    </Router>,
  );
}

afterEach(() => {
  loadModuleMock.mockReset();
});

describe('ModuleView', () => {
  it('shows a loading state before the module resolves', () => {
    loadModuleMock.mockReturnValue(new Promise(() => {})); // never resolves
    renderModuleView('vector-algebra');
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows a not-found card for an unknown module id, with a link back to the gallery', async () => {
    loadModuleMock.mockRejectedValue(new Error('Unknown module: nope'));
    renderModuleView('nope');
    await waitFor(() => expect(screen.getByText(/No module named/)).toBeInTheDocument());
    expect(screen.getByText('Back to the gallery')).toBeInTheDocument();
  });

  it('shows a load-error card (not a white screen) when loadModule rejects for another reason', async () => {
    loadModuleMock.mockRejectedValue(new Error('network fell over'));
    renderModuleView('vector-algebra');
    await waitFor(() => expect(screen.getByText(/Couldn't load/)).toBeInTheDocument());
    expect(screen.getByText(/network fell over/)).toBeInTheDocument();
  });

  it('re-triggers loading when moduleId changes', async () => {
    loadModuleMock.mockRejectedValue(new Error('Unknown module: a'));
    const { rerender } = render(
      <Router hook={() => ['/m/a', () => {}]}>
        <ModuleView moduleId="a" />
      </Router>,
    );
    await waitFor(() => expect(loadModuleMock).toHaveBeenCalledWith('a'));

    rerender(
      <Router hook={() => ['/m/b', () => {}]}>
        <ModuleView moduleId="b" />
      </Router>,
    );
    await waitFor(() => expect(loadModuleMock).toHaveBeenCalledWith('b'));
  });
});
