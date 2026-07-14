import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;
const META_SUFFIX = '.secure-meta';
const ACCESSIBILITY = SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY;

interface ChunkManifest {
  generation: string;
  chunks: number;
}

const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: ACCESSIBILITY,
};

/**
 * Supabase storage adapter backed by native encrypted storage.
 *
 * Values are chunked because a complete Supabase session can exceed the safe
 * size of a single Keychain entry. Reads transparently migrate the legacy
 * AsyncStorage value and only remove it after the encrypted write succeeds.
 */
export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!(await SecureStore.isAvailableAsync())) {
      return AsyncStorage.getItem(key);
    }

    const secureValue = await readSecureValue(key);
    if (secureValue !== null) return secureValue;

    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue === null) return null;

    await writeSecureValue(key, legacyValue);
    await AsyncStorage.removeItem(key);
    return legacyValue;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!(await SecureStore.isAvailableAsync())) {
      await AsyncStorage.setItem(key, value);
      return;
    }

    await writeSecureValue(key, value);
    await AsyncStorage.removeItem(key);
  },

  async removeItem(key: string): Promise<void> {
    if (await SecureStore.isAvailableAsync()) {
      await removeSecureValue(key);
    }
    await AsyncStorage.removeItem(key);
  },
};

async function readSecureValue(key: string): Promise<string | null> {
  const rawManifest = await SecureStore.getItemAsync(`${key}${META_SUFFIX}`, options);
  if (!rawManifest) {
    // Compatibility with any previous single-value SecureStore adapter.
    return SecureStore.getItemAsync(key, options);
  }

  const manifest = JSON.parse(rawManifest) as ChunkManifest;
  const values = await Promise.all(
    Array.from({ length: manifest.chunks }, (_, index) =>
      SecureStore.getItemAsync(chunkKey(key, manifest.generation, index), options)
    )
  );
  if (values.some((value) => value === null)) {
    throw new Error('Encrypted session storage is incomplete');
  }
  return values.join('');
}

async function writeSecureValue(key: string, value: string): Promise<void> {
  const oldManifest = await getManifest(key);
  const generation = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) ?? [''];
  const writtenKeys: string[] = [];

  try {
    for (let index = 0; index < chunks.length; index += 1) {
      const keyForChunk = chunkKey(key, generation, index);
      await SecureStore.setItemAsync(keyForChunk, chunks[index], options);
      writtenKeys.push(keyForChunk);
    }
    await SecureStore.setItemAsync(
      `${key}${META_SUFFIX}`,
      JSON.stringify({ generation, chunks: chunks.length } satisfies ChunkManifest),
      options
    );
  } catch (error) {
    await Promise.all(writtenKeys.map((writtenKey) => SecureStore.deleteItemAsync(writtenKey)));
    throw error;
  }

  if (oldManifest) await removeChunks(key, oldManifest);
  await SecureStore.deleteItemAsync(key);
}

async function removeSecureValue(key: string): Promise<void> {
  const manifest = await getManifest(key);
  if (manifest) await removeChunks(key, manifest);
  await Promise.all([
    SecureStore.deleteItemAsync(`${key}${META_SUFFIX}`),
    SecureStore.deleteItemAsync(key),
  ]);
}

async function getManifest(key: string): Promise<ChunkManifest | null> {
  const raw = await SecureStore.getItemAsync(`${key}${META_SUFFIX}`, options);
  return raw ? JSON.parse(raw) as ChunkManifest : null;
}

async function removeChunks(key: string, manifest: ChunkManifest): Promise<void> {
  await Promise.all(
    Array.from({ length: manifest.chunks }, (_, index) =>
      SecureStore.deleteItemAsync(chunkKey(key, manifest.generation, index))
    )
  );
}

function chunkKey(key: string, generation: string, index: number): string {
  return `${key}.g-${generation}.${index}`;
}
