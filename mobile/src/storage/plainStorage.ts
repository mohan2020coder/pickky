import AsyncStorage from '@react-native-async-storage/async-storage';

export const readText = async (key: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
};

export const writeText = async (key: string, value: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Non-critical UI state; ignore persistence failures.
  }
};

export const removeKey = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
};
