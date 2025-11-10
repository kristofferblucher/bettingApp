// Local storage for saving data

export function saveToStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  const item = localStorage.getItem(key);
  return item ? (JSON.parse(item) as T) : fallback;
}

export function clearStorage() {
  localStorage.clear();
}

