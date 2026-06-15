import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const initializeAppMock = vi.fn((config: unknown) => {
  void config;
  return { app: 'app' };
});
const getAuthMock = vi.fn((app: unknown) => {
  void app;
  return { auth: 'auth' };
});
const initializeFirestoreMock = vi.fn((app: unknown, options: unknown) => {
  void app;
  void options;
  return { db: 'db-persistent' };
});
const getFirestoreMock = vi.fn((app: unknown) => {
  void app;
  return { db: 'db-default' };
});
const getStorageMock = vi.fn((app: unknown) => {
  void app;
  return { storage: 'storage' };
});
const connectFirestoreEmulatorMock = vi.fn((db: unknown, host: unknown, port: unknown) => {
  void db;
  void host;
  void port;
});
const connectAuthEmulatorMock = vi.fn((auth: unknown, url: unknown, options: unknown) => {
  void auth;
  void url;
  void options;
});
const connectStorageEmulatorMock = vi.fn((storage: unknown, host: unknown, port: unknown) => {
  void storage;
  void host;
  void port;
});
const persistentMultipleTabManagerMock = vi.fn(() => ({ manager: 'multi-tab' }));
const persistentLocalCacheMock = vi.fn((options: unknown) => ({
  cache: 'persistent-cache',
  options,
}));

vi.mock('firebase/app', () => ({
  initializeApp: (config: unknown) => initializeAppMock(config),
}));

vi.mock('firebase/auth', () => ({
  getAuth: (app: unknown) => getAuthMock(app),
  connectAuthEmulator: (auth: unknown, url: unknown, options: unknown) =>
    connectAuthEmulatorMock(auth, url, options),
}));

vi.mock('firebase/firestore', () => ({
  initializeFirestore: (app: unknown, options: unknown) => initializeFirestoreMock(app, options),
  getFirestore: (app: unknown) => getFirestoreMock(app),
  connectFirestoreEmulator: (db: unknown, host: unknown, port: unknown) =>
    connectFirestoreEmulatorMock(db, host, port),
  persistentLocalCache: (options: unknown) => persistentLocalCacheMock(options),
  persistentMultipleTabManager: () => persistentMultipleTabManagerMock(),
}));

vi.mock('firebase/storage', () => ({
  getStorage: (app: unknown) => getStorageMock(app),
  connectStorageEmulator: (storage: unknown, host: unknown, port: unknown) =>
    connectStorageEmulatorMock(storage, host, port),
}));

const importFirebaseModule = async () => {
  vi.resetModules();
  return import('./firebase');
};

describe('firebase module', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    (globalThis as { window?: Window }).window = undefined;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    (globalThis as { window?: Window }).window = originalWindow;
  });

  it('initializes app services with default firestore when indexedDb is unavailable', async () => {
    await importFirebaseModule();

    expect(initializeAppMock).toHaveBeenCalledTimes(1);
    expect(getAuthMock).toHaveBeenCalledTimes(1);
    expect(getFirestoreMock).toHaveBeenCalledTimes(1);
    expect(initializeFirestoreMock).not.toHaveBeenCalled();
    expect(getStorageMock).toHaveBeenCalledTimes(1);
    expect(connectFirestoreEmulatorMock).not.toHaveBeenCalled();
    expect(connectAuthEmulatorMock).not.toHaveBeenCalled();
    expect(connectStorageEmulatorMock).not.toHaveBeenCalled();
  });

  it('initializes firestore with persistent local cache when indexedDb is available', async () => {
    (globalThis as { window?: { indexedDB: Record<string, never> } }).window = {
      indexedDB: {},
    };

    await importFirebaseModule();

    expect(persistentMultipleTabManagerMock).toHaveBeenCalledTimes(1);
    expect(persistentLocalCacheMock).toHaveBeenCalledWith({
      tabManager: { manager: 'multi-tab' },
    });
    expect(initializeFirestoreMock).toHaveBeenCalledWith(
      { app: 'app' },
      {
        localCache: {
          cache: 'persistent-cache',
          options: { tabManager: { manager: 'multi-tab' } },
        },
      }
    );
    expect(getFirestoreMock).not.toHaveBeenCalled();
  });

  it('connects firestore/auth/storage emulators when both emulator flags are enabled', async () => {
    vi.stubEnv('VITE_USE_FIREBASE_EMULATORS', 'true');
    vi.stubEnv('VITE_USE_STORAGE_EMULATOR', 'true');
    vi.stubEnv('VITE_FIREBASE_EMULATOR_HOST', 'localhost');
    vi.stubEnv('VITE_FIRESTORE_EMULATOR_PORT', '8085');
    vi.stubEnv('VITE_FIREBASE_AUTH_EMULATOR_PORT', '9095');
    vi.stubEnv('VITE_FIREBASE_STORAGE_EMULATOR_PORT', '9292');

    await importFirebaseModule();

    expect(connectFirestoreEmulatorMock).toHaveBeenCalledWith({ db: 'db-default' }, 'localhost', 8085);
    expect(connectAuthEmulatorMock).toHaveBeenCalledWith(
      { auth: 'auth' },
      'http://localhost:9095',
      { disableWarnings: true }
    );
    expect(connectStorageEmulatorMock).toHaveBeenCalledWith({ storage: 'storage' }, 'localhost', 9292);
    expect(initializeFirestoreMock).not.toHaveBeenCalled();
  });

  it('skips storage emulator when storage flag is disabled', async () => {
    vi.stubEnv('VITE_USE_FIREBASE_EMULATORS', 'true');
    vi.stubEnv('VITE_USE_STORAGE_EMULATOR', 'false');

    await importFirebaseModule();

    expect(connectFirestoreEmulatorMock).toHaveBeenCalledTimes(1);
    expect(connectAuthEmulatorMock).toHaveBeenCalledTimes(1);
    expect(connectStorageEmulatorMock).not.toHaveBeenCalled();
    expect(initializeFirestoreMock).not.toHaveBeenCalled();
  });
});
