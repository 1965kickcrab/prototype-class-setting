export function readJsonStorage(storageKey, fallbackValue) {
  try {
    const storedValue = window.localStorage.getItem(storageKey);

    if (!storedValue) {
      return fallbackValue;
    }

    return JSON.parse(storedValue);
  } catch (error) {
    return fallbackValue;
  }
}

export function writeJsonStorage(storageKey, value) {
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}
