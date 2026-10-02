import { describe, it, expect, vi, afterEach } from 'vitest';

type Listener = (...args: never[]) => void;

function makeEventTarget() {
  const listeners = new Map<string, Set<Listener>>();
  return {
    addEventListener(type: string, listener: Listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    fire(type: string, event: unknown) {
      for (const listener of listeners.get(type) ?? []) (listener as (e: unknown) => void)(event);
    },
  };
}

async function importFresh() {
  vi.resetModules();
  return import('./register');
}

describe('registerServiceWorker', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('does nothing when the browser has no serviceWorker support', async () => {
    vi.stubGlobal('navigator', {});
    const { registerServiceWorker } = await importFresh();
    expect(() => registerServiceWorker()).not.toThrow();
  });

  it('unregisters any existing worker and never registers a new one in dev (P-4)', async () => {
    vi.stubEnv('DEV', true);
    const unregister = vi.fn();
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }, { unregister }]);
    const register = vi.fn();
    vi.stubGlobal('navigator', { serviceWorker: { getRegistrations, register } });

    const { registerServiceWorker } = await importFresh();
    registerServiceWorker();
    await Promise.resolve();
    await Promise.resolve();

    expect(getRegistrations).toHaveBeenCalled();
    expect(unregister).toHaveBeenCalledTimes(2);
    expect(register).not.toHaveBeenCalled();
  });

  it('registers on window load in prod and notifies subscribers once an update installs behind an existing controller', async () => {
    vi.stubEnv('DEV', false);

    const installingWorker = makeEventTarget() as unknown as { state: string } & ReturnType<
      typeof makeEventTarget
    >;
    installingWorker.state = 'installing';

    const registration = makeEventTarget() as unknown as {
      installing: typeof installingWorker;
    } & ReturnType<typeof makeEventTarget>;
    registration.installing = installingWorker;

    const register = vi.fn().mockResolvedValue(registration);
    const swEventTarget = makeEventTarget();
    const fakeServiceWorker = {
      register,
      controller: {}, // an existing controller => an install here is an update
      addEventListener: swEventTarget.addEventListener,
    };
    vi.stubGlobal('navigator', { serviceWorker: fakeServiceWorker });

    const { registerServiceWorker, subscribeUpdateAvailable, isUpdateAvailable } =
      await importFresh();
    const onUpdate = vi.fn();
    subscribeUpdateAvailable(onUpdate);

    registerServiceWorker();
    window.dispatchEvent(new Event('load'));
    await Promise.resolve();
    await Promise.resolve();

    expect(register).toHaveBeenCalledWith(expect.stringContaining('sw.js'));

    registration.fire('updatefound', {});
    installingWorker.state = 'installed';
    installingWorker.fire('statechange', {});

    expect(onUpdate).toHaveBeenCalled();
    expect(isUpdateAvailable()).toBe(true);
  });
});

describe('registerServiceWorker: a worker already waiting at load (X-56)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  async function loadWith(registration: object, controller: object | null) {
    vi.stubEnv('DEV', false);
    const register = vi.fn().mockResolvedValue(registration);
    vi.stubGlobal('navigator', {
      serviceWorker: { register, controller, addEventListener: () => {} },
    });
    const mod = await importFresh();
    const onUpdate = vi.fn();
    mod.subscribeUpdateAvailable(onUpdate);
    mod.registerServiceWorker();
    window.dispatchEvent(new Event('load'));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    return { ...mod, onUpdate };
  }

  it('notifies when a worker is already waiting behind an existing controller, without any updatefound', async () => {
    const registration = { ...makeEventTarget(), waiting: {}, installing: null };
    const { onUpdate, isUpdateAvailable } = await loadWith(registration, {});
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(isUpdateAvailable()).toBe(true);
  });

  it('does NOT notify for a waiting worker when there is no controller (a first-ever install)', async () => {
    const registration = { ...makeEventTarget(), waiting: {}, installing: null };
    const { onUpdate, isUpdateAvailable } = await loadWith(registration, null);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(isUpdateAvailable()).toBe(false);
  });

  it('does not notify when nothing is waiting', async () => {
    const registration = { ...makeEventTarget(), waiting: null, installing: null };
    const { onUpdate } = await loadWith(registration, {});
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe('applyUpdate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('posts SKIP_WAITING and registers the reload listener only after the user calls applyUpdate, never eagerly', async () => {
    const postMessage = vi.fn();
    const getRegistration = vi.fn().mockResolvedValue({ waiting: { postMessage } });
    const addEventListener = vi.fn();
    vi.stubGlobal('navigator', { serviceWorker: { getRegistration, addEventListener } });

    const { applyUpdate } = await importFresh();
    expect(addEventListener).not.toHaveBeenCalled();

    applyUpdate();
    await Promise.resolve();
    await Promise.resolve();

    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    // { once: true } matters: this must be a self-removing, one-shot
    // listener scoped to this specific update, not a standing listener
    // that would also fire (and reload the page) on an unrelated future
    // controllerchange — e.g. a later tab's own first-install claim.
    expect(addEventListener).toHaveBeenCalledWith(
      'controllerchange',
      expect.any(Function),
      expect.objectContaining({ once: true }),
    );
  });
});
