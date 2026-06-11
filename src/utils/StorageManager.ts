import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveSetting = async (key: string, value: any) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Błąd zapisu:', e);
  }
};

export const getSetting = async (key: string, defaultValue: any) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};