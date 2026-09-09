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
    await userEvent.click(screen.getByLabelText('Projector mode'));
    expect(useAppStore.getState().prefs.projector).toBe(true);
  });

  it('toggling the reference grid patches and persists prefs (ADR 0011)', async () => {
    render(<SettingsMenu />);
    await userEvent.click(screen.getByLabelText('Display settings'));
    await userEvent.click(screen.getByLabelText('Reference grid'));
    expect(useAppStore.getState().prefs.showGrid).toBe(false);
    expect(JSON.parse(window.localStorage.getItem('phys-viz:prefs')!).showGrid).toBe(false);
  });

  it('toggling a per-plane grid checkbox patches and persists prefs independently', async () => {
    render(<SettingsMenu />);
    await userEvent.click(screen.getByLabelText('Display settings'));
    expect(screen.getByLabelText('XY grid plane')).not.toBeChecked();
    expect(screen.getByLabelText('XZ grid plane')).not.toBeChecked();
    expect(screen.getByLabelText('YZ grid plane')).not.toBeChecked();
    await userEvent.click(screen.getByLabelText('XZ grid plane'));
    expect(useAppStore.getState().prefs.gridPlaneXZ).toBe(true);
    expect(useAppStore.getState().prefs.gridPlaneXY).toBe(false);
    expect(useAppStore.getState().prefs.gridPlaneYZ).toBe(false);
    expect(JSON.parse(window.localStorage.getItem('phys-viz:prefs')!).gridPlaneXZ).toBe(true);
  });

  it('toggling 2D-only patches transient ui state, not prefs (ADR 0011/0012)', async () => {
    render(<SettingsMenu />);
    await userEvent.click(screen.getByLabelText('Display settings'));
    expect(screen.getByLabelText('2D-only')).toBeChecked(); // checked by default (ADR 0012)
    await userEvent.click(screen.getByLabelText('2D-only'));
    expect(useAppStore.getState().ui.lockTo2D).toBe(false);
    // lockTo2D is `ui` state, not a `prefs` field — toggling it never
    // touches localStorage at all.
    expect(window.localStorage.getItem('phys-viz:prefs')).toBeNull();
  });
});
