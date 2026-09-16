/**
 * Google Authentication
 *
 * Thin wrapper around Firebase Auth's signInWithPopup.
 * The real implementation lives in src/services/firebase.ts → loginWithGoogleSSO.
 */

import type { UserProfile, UserRole } from '../types';
import { loginWithGoogleSSO } from './firebase';

export const GOOGLE_CLIENT_ID =
  '749622907477-8kmphh6mckl7r9q75o88s63ie5r8989h.apps.googleusercontent.com';

export async function signInWithGoogleOAuth(role: UserRole = 'reviewer'): Promise<UserProfile> {
  return loginWithGoogleSSO(role);
}

/** No-op — kept for backward-compat import resolution. */
export function loadGsiScript(): Promise<void> {
  return Promise.resolve();
}
