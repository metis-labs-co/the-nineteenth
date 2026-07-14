import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { secureSessionStorage } from './secureStorage';

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 6,
  isAvailableAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const secureValues = new Map<string, string>();

beforeEach(() => {
  jest.clearAllMocks();
  secureValues.clear();
  (SecureStore.isAvailableAsync as jest.Mock).mockResolvedValue(true);
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) =>
    secureValues.get(key) ?? null
  );
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (key: string, value: string) => {
    secureValues.set(key, value);
  });
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async (key: string) => {
    secureValues.delete(key);
  });
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
});

describe('secureSessionStorage', () => {
  it('round-trips sessions larger than one secure-store value', async () => {
    const session = 'x'.repeat(5000);
    await secureSessionStorage.setItem('auth-token', session);

    await expect(secureSessionStorage.getItem('auth-token')).resolves.toBe(session);
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(4); // 3 chunks + manifest
  });

  it('migrates a legacy AsyncStorage session only after the secure write succeeds', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('legacy-session');

    await expect(secureSessionStorage.getItem('auth-token')).resolves.toBe('legacy-session');

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth-token');
    expect(await secureSessionStorage.getItem('auth-token')).toBe('legacy-session');
  });

  it('leaves the legacy session intact if encrypted migration fails', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('legacy-session');
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('Keychain unavailable'));

    await expect(secureSessionStorage.getItem('auth-token')).rejects.toThrow('Keychain unavailable');
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });

  it('removes encrypted and legacy copies on sign-out', async () => {
    await secureSessionStorage.setItem('auth-token', 'session');
    await secureSessionStorage.removeItem('auth-token');

    await expect(secureSessionStorage.getItem('auth-token')).resolves.toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth-token');
  });
});
