import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHashLocation, useHashSearch, navigateHash } from './hashRouter';

beforeEach(() => {
  window.history.replaceState(null, '', '/phys-viz/');
});

describe('useHashLocation', () => {
  it('reports only the path portion of the hash, not the query', () => {
    window.location.hash = '#/m/vector-algebra?v=1&a=1,2,0';
    const { result } = renderHook(() => useHashLocation());
    expect(result.current[0]).toBe('/m/vector-algebra');
  });

  it('reports "/" for an empty hash', () => {
    window.location.hash = '';
    const { result } = renderHook(() => useHashLocation());
    expect(result.current[0]).toBe('/');
  });

  it('updates when navigateHash changes the hash', () => {
    window.location.hash = '#/';
    const { result } = renderHook(() => useHashLocation());
    act(() => {
      navigateHash('/m/vector-algebra');
    });
    expect(result.current[0]).toBe('/m/vector-algebra');
  });
});

describe('useHashSearch', () => {
  it('returns the query portion, including the leading "?"', () => {
    window.location.hash = '#/m/vector-algebra?v=1&a=1,2,0';
    const { result } = renderHook(() => useHashSearch());
    expect(result.current).toBe('?v=1&a=1,2,0');
  });

  it('returns an empty string when the hash has no query', () => {
    window.location.hash = '#/m/vector-algebra';
    const { result } = renderHook(() => useHashSearch());
    expect(result.current).toBe('');
  });
});

describe('navigateHash', () => {
  it('writes the full target (path + query) into location.hash', () => {
    navigateHash('/m/vector-algebra?v=1');
    expect(window.location.hash).toBe('#/m/vector-algebra?v=1');
  });

  it('replace: true uses replaceState (history length does not grow)', () => {
    navigateHash('/m/a');
    const lengthBefore = window.history.length;
    navigateHash('/m/b', { replace: true });
    expect(window.history.length).toBe(lengthBefore);
    expect(window.location.hash).toBe('#/m/b');
  });

  it('replace: false (default) uses pushState (history length grows)', () => {
    navigateHash('/m/a');
    const lengthBefore = window.history.length;
    navigateHash('/m/c');
    expect(window.history.length).toBe(lengthBefore + 1);
  });
});
