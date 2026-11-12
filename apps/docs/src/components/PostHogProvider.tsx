'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';
import { cookieConsentGiven, consentPersistence } from '../lib/consent';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = import.meta.env.VITE_POSTHOG_KEY;
    if (!key) return;
    posthog.init(key, {
      api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      ui_host: 'https://eu.posthog.com',
      capture_pageview: false, // We capture pageviews manually
      capture_pageleave: true, // Enable pageleave capture
      capture_exceptions: true, // This enables capturing exceptions using Error Tracking, set to false if you don't want this
      debug: import.meta.env.DEV,
      persistence: consentPersistence(cookieConsentGiven()),
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  );
}

function PostHogPageView() {
  const href = useLocation({ select: (location) => location.href });
  const posthog = usePostHog();

  useEffect(() => {
    if (import.meta.env.VITE_POSTHOG_KEY && posthog) {
      posthog.capture('$pageview', {
        $current_url: new URL(href, window.origin).href,
      });
    }
  }, [href, posthog]);

  return null;
}
