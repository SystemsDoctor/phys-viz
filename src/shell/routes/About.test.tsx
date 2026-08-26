import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Router } from 'wouter';
import { About } from './About';

describe('About', () => {
  it('links back to the gallery and mentions both licenses', () => {
    render(
      <Router hook={() => ['/about', () => {}]}>
        <About />
      </Router>,
    );
    expect(screen.getByText(/Back to the gallery/)).toBeInTheDocument();
    expect(screen.getByText('MIT License')).toBeInTheDocument();
    expect(screen.getByText('CC BY-SA 4.0')).toBeInTheDocument();
  });
});
