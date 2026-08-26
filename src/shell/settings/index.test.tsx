import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsMenu } from './index';
import { useAppStore, DEFAULT_PREFS } from '../state/store';

beforeEach(() => {
  window.localStorage.clear();
  useAppStore.setState({ prefs: DEFAULT_PREFS });
});

describe('SettingsMenu', () => {
  it('is closed by default; opens on trigger click', async () => {
    render(<SettingsMenu />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Display settings'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('changing up axis patches the store and persists to localStorage', async () => {
    render(<SettingsMenu />);
    await userEvent.click(screen.getByLabelText('Display settings'));
    await userEvent.selectOptions(screen.getByLabelText('Up axis'), 'z');
    expect(useAppStore.getState().prefs.upAxis).toBe('z');
    expect(JSON.parse(window.localStorage.getItem('phys-viz:prefs')!).upAxis).toBe('z');
  });

  it('toggling projector mode patches the store', async () => {
    render(<SettingsMenu />);
    await userEvent.click(screen.getByLabelText('Display settings'));
    const checkbox = screen.getByRole('checkbox');
    await userEvent.click(checkbox);
    expect(useAppStore.getState().prefs.projector).toBe(true);
  });
});
