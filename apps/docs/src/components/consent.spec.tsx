import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieBanner } from './CookieBanner';
import { PostHogProvider } from './PostHogProvider';

const analytics = vi.hoisted(() => ({
  init: vi.fn(),
  set_config: vi.fn(),
  capture: vi.fn(),
}));
vi.mock('posthog-js', () => ({ default: analytics }));
vi.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: ReactNode }) => children,
  usePostHog: () => analytics,
}));
vi.mock('@tanstack/react-router', () => ({
  useLocation: ({
    select,
  }: {
    select: (location: { href: string }) => string;
  }) => select({ href: '/guide' }),
}));

const mounted = new Map<Root, HTMLElement>();
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const button = (name: string) =>
  Array.from(document.querySelectorAll('button')).find(
    (element) =>
      (element.getAttribute('aria-label') ?? element.textContent?.trim()) ===
      name,
  ) ?? null;
const click = (name: string) => {
  const target = button(name);
  if (!target) throw new Error(`Missing button: ${name}`);
  act(() => target.click());
};
const render = (children: ReactNode) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mounted.set(root, container);
  act(() => root.render(children));
  return {
    unmount: () => {
      act(() => root.unmount());
      container.remove();
      mounted.delete(root);
    },
  };
};
const cleanup = () => {
  for (const [root, container] of mounted) {
    act(() => root.unmount());
    container.remove();
  }
  mounted.clear();
};

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  vi.clearAllMocks();
  vi.stubEnv('VITE_POSTHOG_KEY', 'test-key');
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllEnvs();
  delete actEnvironment.IS_REACT_ACT_ENVIRONMENT;
});

describe('docs consent lifecycle', () => {
  it('renders no banner on the server and reveals an undecided notice after mounting', () => {
    expect(renderToString(<CookieBanner />)).toBe('');
    render(<CookieBanner />);
    expect(button('Accept cookies')).not.toBeNull();
    expect(analytics.set_config).not.toHaveBeenCalled();
  });

  it.each([
    {
      button: 'Accept cookies',
      stored: 'yes',
      persistence: 'localStorage+cookie',
    },
    { button: 'Decline cookies', stored: 'no', persistence: 'memory' },
  ])(
    'stores $stored and updates analytics when $button is selected',
    ({ button: choice, stored, persistence }) => {
      render(<CookieBanner />);
      click(choice);
      expect(localStorage.getItem('cookie_consent')).toBe(stored);
      expect(analytics.set_config).toHaveBeenLastCalledWith({ persistence });
      expect(button('Accept cookies')).toBeNull();
    },
  );

  it('dismisses without persisting a choice and shows the notice again on remount', () => {
    const first = render(<CookieBanner />);
    click('Dismiss cookie notice');
    expect(button('Accept cookies')).toBeNull();
    expect(localStorage.getItem('cookie_consent')).toBeNull();
    expect(analytics.set_config).not.toHaveBeenCalled();
    first.unmount();
    render(<CookieBanner />);
    expect(button('Accept cookies')).not.toBeNull();
  });

  it.each([
    { stored: 'yes', persistence: 'localStorage+cookie' },
    { stored: 'no', persistence: 'memory' },
    { stored: 'unknown', persistence: 'memory' },
  ])('retains stored $stored behavior on mount', ({ stored, persistence }) => {
    localStorage.setItem('cookie_consent', stored);
    render(<CookieBanner />);
    expect(button('Accept cookies')).toBeNull();
    expect(analytics.set_config).toHaveBeenLastCalledWith({ persistence });
    expect(localStorage.getItem('cookie_consent')).toBe(stored);
  });

  it.each([
    { stored: null, persistence: 'memory' },
    { stored: 'yes', persistence: 'localStorage+cookie' },
    { stored: 'no', persistence: 'memory' },
    { stored: 'undecided', persistence: 'memory' },
    { stored: 'unknown', persistence: 'memory' },
  ])(
    'initializes analytics from stored $stored and captures the current page',
    ({ stored, persistence }) => {
      if (stored !== null) localStorage.setItem('cookie_consent', stored);
      render(
        <PostHogProvider>
          <span>Docs</span>
        </PostHogProvider>,
      );
      expect(analytics.init).toHaveBeenCalledWith(
        'test-key',
        expect.objectContaining({ persistence, capture_pageview: false }),
      );
      expect(analytics.capture).toHaveBeenCalledWith('$pageview', {
        $current_url: new URL('/guide', window.origin).href,
      });
    },
  );
});
