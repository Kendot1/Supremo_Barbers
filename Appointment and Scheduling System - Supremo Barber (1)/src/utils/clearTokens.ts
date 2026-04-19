/**
 * Utility to clear authentication tokens
 * Use this if you experience JWT errors
 */

export function clearAuthTokens() {
    if (typeof window !== 'undefined') {

        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');

        return true;
    }
    return false;
}

// Make it available globally for easy debugging
if (typeof window !== 'undefined') {
    (window as any).clearAuthTokens = clearAuthTokens;

}
