import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('renders the trigger content and associates it with the tooltip text via aria-describedby', () => {
    render(<Tooltip text="Explains the thing.">{'ζ'}</Tooltip>);
    const trigger = screen.getByRole('button');
    const tooltip = screen.getByRole('tooltip');
    expect(trigger).toHaveTextContent('ζ');
    expect(tooltip).toHaveTextContent('Explains the thing.');
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);
  });

  it('gives each instance a distinct id, even with identical text', () => {
    render(
      <>
        <Tooltip text="Same text">A</Tooltip>
        <Tooltip text="Same text">B</Tooltip>
      </>,
    );
    const tooltips = screen.getAllByRole('tooltip');
    expect(tooltips[0].id).not.toBe(tooltips[1].id);
  });
});
