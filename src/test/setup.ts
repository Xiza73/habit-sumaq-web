import '@testing-library/jest-dom/vitest';

// jsdom does not implement ResizeObserver. Components that call
// `new ResizeObserver(...)` (e.g. HabitHeatmap) would throw on mount.
// Stub it globally so tests can render those components without
// having to mock per-file.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
