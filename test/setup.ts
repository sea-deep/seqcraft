import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// ResizeObserver mock
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as any;

afterEach(() => {
  cleanup();
});
