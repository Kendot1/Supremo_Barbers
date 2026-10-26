/**
 * Utility to clear authentication tokens
 * Use this during local development if you experience JWT errors.
 */

import { clearAuthSession } from './authStorage';

export function clearAuthTokens() {
    if (typeof window !== 'undefined') {

        clearAuthSession();

        return true;
    }
    return false;
}

// Make it available globally for easy debugging
if (import.meta.env.DEV && typeof window !== 'undefined') {
    (window as any).clearAuthTokens = clearAuthTokens;

}
