type Listener = () => void;

let overrideTitle: string | null = null;
const listeners = new Set<Listener>();

export function getDocumentTitleOverride(): string | null {
  return overrideTitle;
}

export function setDocumentTitleOverride(title: string | null): void {
  overrideTitle = title?.trim() || null;
  listeners.forEach((listener) => listener());
}

export function subscribeDocumentTitleOverride(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
