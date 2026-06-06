import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const initializeAppMock = vi.fn((_config: unknown) => ({ app: 'app' }));
const getAuthMock = vi.fn((_app: unknown) => ({ auth: 'auth' }));
const getFirestoreMock = vi.fn((_app: unknown) => ({ db: 'db' }));
const getStorageMock = vi.fn((_app: unknown) => ({ storage: 'storage' }));
const connectFirestoreEmulatorMock = vi.fn((_db: unknown, _host: unknown, _port: unknown) => undefined);
const connectAuthEmulatorMock = vi.fn((_auth: unknown, _url: unknown, _options: unknown) => undefined);
const connectStorageEmulatorMock = vi.fn((_storage: unknown, _host: unknown, _port: unknown) => undefined);
const enableIndexedDbPersistenceMock = vi.fn((_db: unknown) => Promise.resolve());

vi.mock('firebase/app', () => ({
  initializeApp: (config: unknown) => initializeAppMock(config),
}));

vi.mock('firebase/auth', () => ({
  getAuth: (app: unknown) => getAuthMock(app),
  connectAuthEmulator: (auth: unknown, url: unknown, options: unknown) =>
    connectAuthEmulatorMock(auth, url, options),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: (app: unknown) => getFirestoreMock(app),
  connectFirestoreEmulator: (db: unknown, host: unknown, port: unknown) =>
    connectFirestoreEmulatorMock(db, host, port),
  enableIndexedDbPersistence: (db: unknown) => enableIndexedDbPersistenceMock(db),
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    enableIndexedDbPersistenceMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('initializes app services and enables persistence by default', async () => {
    await importFirebaseModule();

    expect(initializeAppMock).toHaveBeenCalledTimes(1);
    expect(getAuthMock).toHaveBeenCalledTimes(1);
    expect(getFirestoreMock).toHaveBeenCalledTimes(1);
    expect(getStorageMock).toHaveBeenCalledTimes(1);
    expect(enableIndexedDbPersistenceMock).toHaveBeenCalledTimes(1);
    expect(connectFirestoreEmulatorMock).not.toHaveBeenCalled();
    expect(connectAuthEmulatorMock).not.toHaveBeenCalled();
    expect(connectStorageEmulatorMock).not.toHaveBeenCalled();
  });

  it('connects firestore/auth/storage emulators when both emulator flags are enabled', async () => {
    vi.stubEnv('VITE_USE_FIREBASE_EMULATORS', 'true');
    vi.stubEnv('VITE_USE_STORAGE_EMULATOR', 'true');
    vi.stubEnv('VITE_FIREBASE_EMULATOR_HOST', 'localhost');
    vi.stubEnv('VITE_FIRESTORE_EMULATOR_PORT', '8085');
    vi.stubEnv('VITE_FIREBASE_AUTH_EMULATOR_PORT', '9095');
    vi.stubEnv('VITE_FIREBASE_STORAGE_EMULATOR_PORT', '9292');

    await importFirebaseModule();

    expect(connectFirestoreEmulatorMock).toHaveBeenCalledWith({ db: 'db' }, 'localhost', 8085);
    expect(connectAuthEmulatorMock).toHaveBeenCalledWith(
      { auth: 'auth' },
      'http://localhost:9095',
      { disableWarnings: true }
    );
    expect(connectStorageEmulatorMock).toHaveBeenCalledWith({ storage: 'storage' }, 'localhost', 9292);
    expect(enableIndexedDbPersistenceMock).not.toHaveBeenCalled();
  });

  it('skips storage emulator when storage flag is disabled', async () => {
    vi.stubEnv('VITE_USE_FIREBASE_EMULATORS', 'true');
    vi.stubEnv('VITE_USE_STORAGE_EMULATOR', 'false');

    await importFirebaseModule();

    expect(connectFirestoreEmulatorMock).toHaveBeenCalledTimes(1);
    expect(connectAuthEmulatorMock).toHaveBeenCalledTimes(1);
    expect(connectStorageEmulatorMock).not.toHaveBeenCalled();
    expect(enableIndexedDbPersistenceMock).not.toHaveBeenCalled();
  });

  it('logs failed-precondition persistence warning', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    enableIndexedDbPersistenceMock.mockRejectedValueOnce({ code: 'failed-precondition' });

    await importFirebaseModule();
    await Promise.resolve();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Multiple tabs open, persistence can only be enabled in one tab at a time.'
    );
  });

  it('logs unimplemented persistence warning', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    enableIndexedDbPersistenceMock.mockRejectedValueOnce({ code: 'unimplemented' });

    await importFirebaseModule();
    await Promise.resolve();

    expect(consoleSpy).toHaveBeenCalledWith(
      'The current browser does not support all of the features required to enable persistence'
    );
  });
});
