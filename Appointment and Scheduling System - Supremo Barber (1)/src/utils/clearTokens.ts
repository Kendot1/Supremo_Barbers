/**
 * Utility to clear authentication tokens
 * Use this if you experience JWT errors
 */

export function clearAuthTokens() {
    if (typeof window !== 'undefined') {
        console.log('🧹 Clearing authentication tokens from localStorage...');
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        console.log('✅ Tokens cleared successfully!');
        console.log('💡 Please reload the page');
        return true;
    }
    return false;
}

// Make it available globally for easy debugging
if (typeof window !== 'undefined') {
    (window as any).clearAuthTokens = clearAuthTokens;
    console.log('💡 Debug helper loaded: Run window.clearAuthTokens() to clear invalid tokens');
}
