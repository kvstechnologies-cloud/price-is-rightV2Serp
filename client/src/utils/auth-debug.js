// Authentication Debug Utility
// This helps debug authentication issues in the browser console

export class AuthDebugger {
    constructor() {
        this.debugMode = true;
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`🔐 [AUTH DEBUG] ${message}`, data || '');
        }
    }

    checkAuthState() {
        this.log('=== AUTHENTICATION STATE CHECK ===');
        
        // Check localStorage
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        const userEmail = localStorage.getItem('userEmail');
        
        this.log('localStorage state:', {
            isAuthenticated,
            userEmail
        });

        // Check app configuration
        const appConfig = window.CONFIG || {};
        this.log('App configuration:', appConfig);

        return {
            localStorage: { isAuthenticated, userEmail },
            appConfig,
            timestamp: new Date().toISOString()
        };
    }

    clearAuthState() {
        this.log('Clearing authentication state...');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userEmail');
        this.log('Authentication state cleared');
    }

    simulateLogin(email = 'test@example.com') {
        this.log('Simulating login for:', email);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', email);
        this.log('Login simulation complete');
    }

    simulateLogout() {
        this.log('Simulating logout...');
        this.clearAuthState();
        this.log('Logout simulation complete');
    }
}

// Create global debugger instance
window.authDebugger = new AuthDebugger();

// Add helpful console commands
console.log(`
🔐 Authentication Debug Commands Available:
- authDebugger.checkAuthState() - Check current auth state
- authDebugger.clearAuthState() - Clear stored auth
- authDebugger.simulateLogin('email') - Simulate login
- authDebugger.simulateLogout() - Simulate logout
`);
