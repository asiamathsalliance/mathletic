const STORAGE_KEY = "math-exam-prep-dashboard-saved-v1";

export type SavedDashboardItem = {
  id: string;
  type: "image" | "typed";
  /** For typed: the question/answer text. For image: data URL (base64). */
  content: string;
  analysis: string;
  createdAt: number;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParse(json: string | null): SavedDashboardItem[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed as SavedDashboardItem[];
  } catch {
    // ignore
  }
  return [];
}

export function getSavedDashboardItems(): SavedDashboardItem[] {
  if (!isBrowser()) return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function addSavedDashboardItem(item: Omit<SavedDashboardItem, "id" | "createdAt">): SavedDashboardItem {
  const list = getSavedDashboardItems();
  const newItem: SavedDashboardItem = {
    ...item,
    id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
  };
  list.unshift(newItem);
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // quota or privacy
    }
  }
  return newItem;
}

export function removeSavedDashboardItem(id: string): void {
  if (!isBrowser()) return;
  const list = getSavedDashboardItems().filter((i) => i.id !== id);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}
