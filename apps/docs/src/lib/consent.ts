const consentKey = 'cookie_consent';

export function cookieConsentGiven(): string {
  if (typeof window === 'undefined') return 'undecided';
  return localStorage.getItem(consentKey) || 'undecided';
}

export function saveCookieConsent(consent: 'yes' | 'no'): void {
  localStorage.setItem(consentKey, consent);
}

export const consentPersistence = (
  consent: string,
): 'localStorage+cookie' | 'memory' =>
  consent === 'yes' ? 'localStorage+cookie' : 'memory';
