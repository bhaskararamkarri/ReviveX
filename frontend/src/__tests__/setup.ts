import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Global mocks for Next.js navigation and environment
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn((param: string) => {
      if (param === 'tab') return null;
      if (param === 'status') return null;
      if (param === 'method') return null;
      return null;
    }),
  }),
  usePathname: () => '/overview',
  useParams: () => ({ caseId: 'RC-001', incidentId: 'INC-001', transactionId: 'TX-1001' }),
}));

// Mock Next.js Link component using React.createElement
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => {
    return React.createElement('a', { href, ...props }, children);
  },
}));

// Mock ResizeObserver class for Recharts
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as any;
window.ResizeObserver = MockResizeObserver as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
